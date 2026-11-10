
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

import User from '../models/User.js';
import { config } from '../config/env.js';

const router = express.Router();

// ============================================================
// USER REGISTRATION
// POST /api/auth/register
// ============================================================

router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Name, email and password are required'
      });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName || cleanName.length > 80) {
      return res.status(400).json({
        error: 'Name must be between 1 and 80 characters'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return res.status(400).json({
        error: 'Please provide a valid email address'
      });
    }

    if (password.length < 8 || password.length > 128) {
      return res.status(400).json({
        error: 'Password must be between 8 and 128 characters'
      });
    }

    const existingUser = await User.findOne({
      email: cleanEmail
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: cleanName,
      email: cleanEmail,
      password: hashedPassword,
      role: 'user'
    });

    const token = jwt.sign(
      { userId: user._id.toString() },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
        algorithm: 'HS256'
      }
    );

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({
        error: 'An account with this email already exists'
      });
    }

    next(error);
  }
});

// ============================================================
// USER LOGIN
// POST /api/auth/login
// ============================================================

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        error: 'Email and password are required'
      });
    }

    const cleanEmail = email.trim().toLowerCase();

    const user = await User.findOne({
      email: cleanEmail
    }).select('+password');

    if (!user) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const passwordMatches = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid email or password'
      });
    }

    const token = jwt.sign(
      { userId: user._id.toString() },
      config.jwtSecret,
      {
        expiresIn: config.jwtExpiresIn,
        algorithm: 'HS256'
      }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    next(error);
  }
});

export default router;
