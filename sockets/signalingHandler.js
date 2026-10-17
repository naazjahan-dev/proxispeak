import UserSession from '../models/UserSession.js';
import { config } from '../config/env.js';
import { parseCoordinates } from '../utils/coordinates.js';

// Read through the validated config so .env is always applied (the previous
// code read process.env at import time, before dotenv.config() had run).
const PROXIMITY_RADIUS = config.proximityRadius; // virtual-office pixels

/**
 * Registers all real-time signaling, geospatial proximity tracking,
 * and WebRTC peer negotiation handlers on a connected socket.
 *
 * @param {import('socket.io').Server} io - Socket.io Server instance
 * @param {import('socket.io').Socket} socket - Incoming client socket
 */
export const registerSignalingHandler = (io, socket) => {
  console.log(`[Socket.io] Client connected: ${socket.id}`);

  /**
   * 1. JOIN ROOM
   * Joins a virtual office room and initializes user position in MongoDB.
   */
  socket.on('join-room', async (data, callback) => {
    try {
      const payload = data && typeof data === 'object' ? data : {};
      const { userId, roomId } = payload;

      if (!userId || !roomId) {
        const errorMsg = 'userId and roomId are required to join room';
        if (typeof callback === 'function') callback({ success: false, error: errorMsg });
        return socket.emit('error', { event: 'join-room', message: errorMsg });
      }

      // Coordinates are optional on join (default origin), but if provided they
      // must be valid finite planar [x, y] values.
      const coordsProvided =
        payload.coordinates !== undefined || payload.x !== undefined || payload.y !== undefined;
      const parsed = parseCoordinates(payload, { maxAbs: config.maxCoordinateAbs });
      if (coordsProvided && !parsed.ok) {
        if (typeof callback === 'function') callback({ success: false, error: parsed.error });
        return socket.emit('error', { event: 'join-room', message: parsed.error });
      }
      const coordinates = parsed.ok ? parsed.coordinates : [0, 0];

      // Bind socket metadata for fast access during disconnect
      socket.userId = userId;
      socket.roomId = roomId;

      // Join the Socket.io room channel
      await socket.join(roomId);

      // Persist or upsert user session in MongoDB
      await UserSession.upsertSession(socket.id, userId, roomId, coordinates);

      // Perform MongoDB $near proximity check (sub-20ms targeted)
      const startTime = performance.now();
      const nearbyPeers = await UserSession.findNearbyPeers(roomId, coordinates, PROXIMITY_RADIUS, socket.id);
      const queryDurationMs = (performance.now() - startTime).toFixed(2);

      console.log(
        `[Proximity] User ${userId} joined room ${roomId} at [${coordinates.join(', ')}]. Found ${nearbyPeers.length} peers within ${PROXIMITY_RADIUS}px in ${queryDurationMs}ms.`
      );

      // Notify the joining user with active nearby peers
      const responsePayload = {
        success: true,
        userId,
        roomId,
        coordinates,
        proximityRadius: PROXIMITY_RADIUS,
        nearbyPeers,
        queryDurationMs: Number(queryDurationMs),
      };

      socket.emit('room-joined', responsePayload);
      if (typeof callback === 'function') callback(responsePayload);

      // Broadcast to all other users in the room that this user joined
      socket.to(roomId).emit('peer-joined', {
        userId,
        socketId: socket.id,
        coordinates,
      });

      // Notify nearby peers specifically to initiate WebRTC peer connections
      nearbyPeers.forEach((peer) => {
        io.to(peer.socketId).emit('peer-entered-proximity', {
          userId,
          socketId: socket.id,
          coordinates,
        });
      });
    } catch (err) {
      console.error(`[Socket.io] Error in join-room for socket ${socket.id}:`, err);
      if (typeof callback === 'function') callback({ success: false, error: err.message });
      socket.emit('error', { event: 'join-room', message: err.message });
    }
  });

  /**
   * 2. UPDATE POSITION & GEOSPATIAL PROXIMITY ENGINE
   * Updates position in MongoDB and queries 2dsphere index with $near
   * to discover peers within the 100px proximity radius.
   */
  socket.on('update-position', async (data) => {
    try {
      const payload = data && typeof data === 'object' ? data : {};
      // Trust the server-side socket binding, never client-supplied identity.
      const roomId = socket.roomId;
      const userId = socket.userId;

      if (!roomId || !userId) {
        return socket.emit('error', { event: 'update-position', message: 'join a room before updating position' });
      }

      const parsed = parseCoordinates(payload, { maxAbs: config.maxCoordinateAbs });
      if (!parsed.ok) {
        return socket.emit('error', { event: 'update-position', message: parsed.error });
      }
      const coordinates = parsed.coordinates;

      const startTime = performance.now();

      // Parallel execution: Update current position & fetch nearby peers
      const [, nearbyPeers] = await Promise.all([
        UserSession.updateOne(
          { socketId: socket.id },
          {
            $set: {
              location: { type: 'Point', coordinates },
              lastActiveAt: new Date(),
            },
          }
        ),
        UserSession.findNearbyPeers(roomId, coordinates, PROXIMITY_RADIUS, socket.id),
      ]);

      const queryDurationMs = (performance.now() - startTime).toFixed(2);

      // Send proximity update to the mover
      socket.emit('proximity-update', {
        coordinates,
        nearbyPeers,
        queryDurationMs: Number(queryDurationMs),
      });

      // Broadcast new position to the room so peers can calculate spatial audio panning & attenuation
      socket.to(roomId).emit('peer-position-updated', {
        userId,
        socketId: socket.id,
        coordinates,
      });
    } catch (err) {
      console.error(`[Socket.io] Error in update-position for socket ${socket.id}:`, err);
      socket.emit('error', { event: 'update-position', message: err.message });
    }
  });

  /**
   * 3. WEBRTC SIGNALING: OFFER RELAY
   */
  socket.on('offer', (data) => {
    const { toSocketId, offer } = data;
    if (!toSocketId || !offer) {
      return socket.emit('error', { message: 'toSocketId and offer payload are required' });
    }

    io.to(toSocketId).emit('offer', {
      fromSocketId: socket.id,
      fromUserId: socket.userId,
      offer,
    });
  });

  /**
   * 4. WEBRTC SIGNALING: ANSWER RELAY
   */
  socket.on('answer', (data) => {
    const { toSocketId, answer } = data;
    if (!toSocketId || !answer) {
      return socket.emit('error', { message: 'toSocketId and answer payload are required' });
    }

    io.to(toSocketId).emit('answer', {
      fromSocketId: socket.id,
      fromUserId: socket.userId,
      answer,
    });
  });

  /**
   * 5. WEBRTC SIGNALING: ICE CANDIDATE RELAY
   */
  socket.on('ice-candidate', (data) => {
    const { toSocketId, candidate } = data;
    if (!toSocketId || !candidate) {
      return socket.emit('error', { message: 'toSocketId and candidate payload are required' });
    }

    io.to(toSocketId).emit('ice-candidate', {
      fromSocketId: socket.id,
      fromUserId: socket.userId,
      candidate,
    });
  });

  /**
   * 6. GRACEFUL DISCONNECT HANDLER
   * Cleans up MongoDB session document and informs room peers.
   */
  socket.on('disconnect', async (reason) => {
    console.log(`[Socket.io] Client disconnected: ${socket.id} (Reason: ${reason})`);
    try {
      const session = await UserSession.deactivateSession(socket.id);
      if (session) {
        console.log(`[Session] Deactivated session for user ${session.userId} in room ${session.roomId}`);
        // Notify peers in the room
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
      console.error(`[Socket.io] Error during disconnect cleanup for socket ${socket.id}:`, err);
    }
  });
};

export default registerSignalingHandler;
