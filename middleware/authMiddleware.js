import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { config } from '../config/env.js';

// ============================================================
// 1. VERIFY JWT TOKEN
// ============================================================

export async function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication token is required'
    });
  }

  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: 'Authentication token is required'
    });
  }

  let decoded;

  try {
    decoded = jwt.verify(token, config.jwtSecret, {
      algorithms: ['HS256']
    });

  } catch (error) {
    // Diagnostic log: never print the token or secret.
    console.error(
      '[JWT Verification Error]',
      error.name,
      error.message
    );

    return res.status(401).json({
      error: 'Invalid or expired authentication token'
    });
  }

  if (!decoded || typeof decoded.userId !== 'string') {
    return res.status(401).json({
      error: 'Invalid authentication token payload'
    });
  }

  try {
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User account not found'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    next(error);
  }
}

// ============================================================
// 2. VERIFY ADMIN ROLE
// ============================================================

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'Admin access required'
    });
  }

  next();
}