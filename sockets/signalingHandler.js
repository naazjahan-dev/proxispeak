import UserSession from '../models/UserSession.js';
import { config } from '../config/env.js';
import { parseCoordinates } from '../utils/coordinates.js';
import { validateId, validateSessionDescription, validateIceCandidate } from '../utils/validate.js';
import { createRateLimiter } from '../utils/rateLimiter.js';

const PROXIMITY_RADIUS = config.proximityRadius; // virtual-office pixels

function emitError(socket, event, message) {
  socket.emit('error', { event, message });
}

/**
 * Resolve a WebRTC signaling target that is allowed to receive from this
 * socket: it must exist and be in the same room. Prevents cross-room relay.
 *
 * @returns {{ ok: true, socket: import('socket.io').Socket } | { ok: false, error: string }}
 */
function resolveSameRoomPeer(io, socket, toSocketId) {
  const target = io.sockets.sockets.get(toSocketId);
  if (!target) return { ok: false, error: 'target peer not found' };
  if (!socket.roomId || target.roomId !== socket.roomId) {
    return { ok: false, error: 'target peer is not in your room' };
  }
  return { ok: true, socket: target };
}

/**
 * Registers real-time proximity tracking and WebRTC signaling handlers.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export const registerSignalingHandler = (io, socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  const positionLimiter = createRateLimiter({
    capacity: config.rateLimitPositionPerSec,
    refillPerSec: config.rateLimitPositionPerSec,
  });
  const signalLimiter = createRateLimiter({
    capacity: config.rateLimitSignalPerSec,
    refillPerSec: config.rateLimitSignalPerSec,
  });

  /**
   * 1. JOIN ROOM
   * Binds the socket identity, joins the room channel, persists the session and
   * returns nearby peers. Identity is captured on the socket and is never
   * accepted from later client payloads.
   */
  socket.on('join-room', async (data, callback) => {
    const respond = (payload) => {
      if (typeof callback === 'function') callback(payload);
    };

    try {
      const payload = data && typeof data === 'object' ? data : {};

      const userIdCheck = validateId(payload.userId, 'userId');
      const roomIdCheck = validateId(payload.roomId, 'roomId');
      if (!userIdCheck.ok || !roomIdCheck.ok) {
        const message = userIdCheck.error || roomIdCheck.error;
        respond({ success: false, error: message });
        return emitError(socket, 'join-room', message);
      }
      const userId = userIdCheck.value;
      const roomId = roomIdCheck.value;

      const coordsProvided =
        payload.coordinates !== undefined || payload.x !== undefined || payload.y !== undefined;
      const parsed = parseCoordinates(payload, { maxAbs: config.maxCoordinateAbs });
      if (coordsProvided && !parsed.ok) {
        respond({ success: false, error: parsed.error });
        return emitError(socket, 'join-room', parsed.error);
      }
      const coordinates = parsed.ok ? parsed.coordinates : [0, 0];

      // Bind identity to the socket for the lifetime of the connection.
      const previousRoom = socket.roomId;
      socket.userId = userId;
      socket.roomId = roomId;

      // Re-join/room switch: leave the previous Socket.IO room and tell it.
      if (previousRoom && previousRoom !== roomId) {
        await socket.leave(previousRoom);
        socket.to(previousRoom).emit('peer-left', {
          socketId: socket.id,
          userId: socket.userId,
          roomId: previousRoom,
        });
      }

      // Duplicate connection: if the same user is already connected on another
      // socket, replace it so one user has one live session.
      const duplicateSessions = await UserSession.find({
        userId,
        isActive: true,
        socketId: { $ne: socket.id },
      })
        .select('socketId')
        .lean();
      for (const duplicate of duplicateSessions) {
        const duplicateSocket = io.sockets.sockets.get(duplicate.socketId);
        if (duplicateSocket) {
          duplicateSocket.emit('session-replaced', { userId, roomId });
          duplicateSocket.disconnect(true);
        }
      }

      await socket.join(roomId);
      await UserSession.upsertSession(socket.id, userId, roomId, coordinates);

      const startTime = performance.now();
      const nearbyPeers = await UserSession.findNearbyPeers(roomId, coordinates, PROXIMITY_RADIUS, socket.id);
      const queryDurationMs = Number((performance.now() - startTime).toFixed(2));

      socket.data.nearbySocketIds = new Set(nearbyPeers.map((peer) => peer.socketId));

      const responsePayload = {
        success: true,
        userId,
        roomId,
        coordinates,
        proximityRadius: PROXIMITY_RADIUS,
        nearbyPeers,
        queryDurationMs,
      };
      socket.emit('room-joined', responsePayload);
      respond(responsePayload);

      socket.to(roomId).emit('peer-joined', { userId, socketId: socket.id, coordinates });

      nearbyPeers.forEach((peer) => {
        const peerSocket = io.sockets.sockets.get(peer.socketId);
        if (peerSocket && peerSocket.data.nearbySocketIds instanceof Set) {
          peerSocket.data.nearbySocketIds.add(socket.id);
        }
        io.to(peer.socketId).emit('peer-entered-proximity', {
          userId,
          socketId: socket.id,
          coordinates,
        });
      });
    } catch (err) {
      console.error(`[Socket.io] join-room error for ${socket.id}:`, err.message);
      const message = 'failed to join room';
      respond({ success: false, error: message });
      emitError(socket, 'join-room', message);
    }
  });

  /**
   * 2. UPDATE POSITION
   * Requires a prior join; the socket's bound identity is used, not the payload.
   */
  socket.on('update-position', async (data) => {
    try {
      if (!socket.roomId || !socket.userId) {
        return emitError(socket, 'update-position', 'join a room before updating position');
      }
      if (!positionLimiter.consume()) {
        return emitError(socket, 'update-position', 'rate limit exceeded');
      }

      const payload = data && typeof data === 'object' ? data : {};
      const parsed = parseCoordinates(payload, { maxAbs: config.maxCoordinateAbs });
      if (!parsed.ok) {
        return emitError(socket, 'update-position', parsed.error);
      }
      const coordinates = parsed.coordinates;

      const startTime = performance.now();
      const [, nearbyPeers] = await Promise.all([
        UserSession.updateOne(
          { socketId: socket.id, isActive: true },
          { $set: { location: { type: 'Point', coordinates }, lastActiveAt: new Date() } }
        ),
        UserSession.findNearbyPeers(socket.roomId, coordinates, PROXIMITY_RADIUS, socket.id),
      ]);
      const queryDurationMs = Number((performance.now() - startTime).toFixed(2));

      // Emit proximity enter/leave deltas so peers can start or tear down
      // WebRTC connections as avatars move in and out of range.
      const previous = socket.data.nearbySocketIds instanceof Set ? socket.data.nearbySocketIds : new Set();
      const next = new Set(nearbyPeers.map((peer) => peer.socketId));

      for (const peer of nearbyPeers) {
        if (previous.has(peer.socketId)) continue;
        const peerSocket = io.sockets.sockets.get(peer.socketId);
        if (peerSocket && peerSocket.data.nearbySocketIds instanceof Set) {
          peerSocket.data.nearbySocketIds.add(socket.id);
        }
        io.to(peer.socketId).emit('peer-entered-proximity', {
          userId: socket.userId,
          socketId: socket.id,
          coordinates,
        });
      }
      for (const peerSocketId of previous) {
        if (next.has(peerSocketId)) continue;
        const peerSocket = io.sockets.sockets.get(peerSocketId);
        if (peerSocket && peerSocket.data.nearbySocketIds instanceof Set) {
          peerSocket.data.nearbySocketIds.delete(socket.id);
        }
        io.to(peerSocketId).emit('peer-left-proximity', {
          userId: socket.userId,
          socketId: socket.id,
          roomId: socket.roomId,
        });
      }
      socket.data.nearbySocketIds = next;

      socket.emit('proximity-update', { coordinates, nearbyPeers, queryDurationMs });
      socket.to(socket.roomId).emit('peer-position-updated', {
        userId: socket.userId,
        socketId: socket.id,
        coordinates,
      });
    } catch (err) {
      console.error(`[Socket.io] update-position error for ${socket.id}:`, err.message);
      emitError(socket, 'update-position', 'failed to update position');
    }
  });

  /**
   * 3-5. WEBRTC SIGNALING RELAY (offer / answer / ice-candidate)
   * Each relay validates the payload and restricts delivery to a peer in the
   * same room.
   */
  const registerSignalRelay = (eventName, validate) => {
    socket.on(eventName, (data) => {
      if (!socket.roomId || !socket.userId) {
        return emitError(socket, eventName, 'join a room before signaling');
      }
      if (!signalLimiter.consume()) {
        return emitError(socket, eventName, 'rate limit exceeded');
      }

      const payload = data && typeof data === 'object' ? data : {};
      const targetCheck = validateId(payload.toSocketId, 'toSocketId');
      if (!targetCheck.ok) {
        return emitError(socket, eventName, targetCheck.error);
      }

      const bodyCheck = validate(payload);
      if (!bodyCheck.ok) {
        return emitError(socket, eventName, bodyCheck.error);
      }

      const resolved = resolveSameRoomPeer(io, socket, targetCheck.value);
      if (!resolved.ok) {
        return emitError(socket, eventName, resolved.error);
      }

      resolved.socket.emit(eventName, {
        fromSocketId: socket.id,
        fromUserId: socket.userId,
        ...bodyCheck.forward,
      });
    });
  };

  registerSignalRelay('offer', (payload) => {
    const check = validateSessionDescription(payload.offer);
    return check.ok ? { ok: true, forward: { offer: payload.offer } } : check;
  });

  registerSignalRelay('answer', (payload) => {
    const check = validateSessionDescription(payload.answer);
    return check.ok ? { ok: true, forward: { answer: payload.answer } } : check;
  });

  registerSignalRelay('ice-candidate', (payload) => {
    const check = validateIceCandidate(payload.candidate);
    return check.ok ? { ok: true, forward: { candidate: payload.candidate } } : check;
  });

  /**
   * 6. DISCONNECT
   * Deactivates the session and informs the room.
   */
  socket.on('disconnect', async (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (${reason})`);
    try {
      const session = await UserSession.deactivateSession(socket.id);
      if (session) {
        io.to(session.roomId).emit('peer-left', {
          socketId: socket.id,
          userId: session.userId,
          roomId: session.roomId,
        });
        io.to(session.roomId).emit('peer-disconnected', {
          socketId: socket.id,
          userId: session.userId,
          roomId: session.roomId,
        });
      }
    } catch (err) {
      console.error(`[Socket.io] disconnect cleanup error for ${socket.id}:`, err.message);
    }
  });
};

export default registerSignalingHandler;
