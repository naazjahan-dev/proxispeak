# ProxiSpeak Backend 🌐🎧

Real-Time Geospatial Audio & WebRTC Signaling Ecosystem for Virtual Offices.

ProxiSpeak powers spatial proximity-based audio communication in virtual offices. As avatars move closer inside a 2D floorplan, peer connections are negotiated and audio volume / panning is modulated in real time based on Euclidean distance and MongoDB `2dsphere` spatial indexing.

---

## ⚡ Core Technical Architecture

1. **Express.js & Node.js (ESM):** Fast, non-blocking asynchronous REST and WebSocket server.
2. **Socket.io with Redis Adapter:** High-frequency bi-directional event stream with `@socket.io/redis-adapter` for seamless multi-instance horizontal scaling across clusters.
3. **MongoDB Geospatial Engine:** Mongoose schema equipped with strict `2dsphere` index on GeoJSON `Point` coordinates (`[x, y]` mapped to `[lng, lat]`).
4. **Sub-20ms Proximity Lookups:** Utilizing compound indexing `{ roomId: 1, location: "2dsphere" }`, lean queries (`.lean()`), and minimal field projection to achieve ultra-fast MongoDB `$near` queries within a 100-pixel proximity radius.
5. **WebRTC Signaling Relay:** Bidirectional relay for SDP offers, answers, and ICE candidate negotiation.

---

## 📁 Project Structure

```
ProxiSpeakDB/
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts (ES Modules)
├── server.js                     # Server entry point, Socket.io & Redis adapter binding
├── config/
│   ├── db.js                     # Mongoose connection with pooling
│   └── redis.js                  # Redis pub/sub clients
├── models/
│   └── UserSession.js            # GeoJSON schema with 2dsphere index & $near helpers
└── sockets/
    └── signalingHandler.js       # Real-time signaling & proximity engine
```

---

## 📡 Socket.io Events & API Specifications

### Client -> Server Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `join-room` | `{ userId, roomId, coordinates: [x, y] }` | Joins room, creates session, queries nearby peers |
| `update-position`| `{ roomId, coordinates: [x, y] }` | Updates position in DB and triggers `$near` proximity check |
| `offer` | `{ toSocketId, offer }` | Relays WebRTC SDP Offer to peer |
| `answer` | `{ toSocketId, answer }` | Relays WebRTC SDP Answer to peer |
| `ice-candidate` | `{ toSocketId, candidate }` | Relays ICE Candidate to peer |
| `disconnect` | *(automatic)* | Cleans up session and notifies room peers |

### Server -> Client Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `room-joined` | `{ userId, roomId, coordinates, nearbyPeers, queryDurationMs }` | Acknowledges join with peers within 100px |
| `proximity-update`| `{ coordinates, nearbyPeers, queryDurationMs }` | Emitted to mover with updated nearby peers |
| `peer-joined` | `{ userId, socketId, coordinates }` | Broadcast to room that new avatar joined |
| `peer-entered-proximity`| `{ userId, socketId, coordinates }` | Direct trigger to initiate WebRTC connection |
| `peer-position-updated`| `{ userId, socketId, coordinates }` | Position broadcast for client-side audio panning |
| `peer-disconnected`| `{ socketId, userId, roomId }` | Emitted when peer leaves or disconnects |

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js >= 18.0.0 (Tested on Node v22)
- MongoDB instance (Local or Atlas)
- Redis instance (Local or Redis Cloud)

### 2. Environment Setup
Configure `.env`:
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/proxispeak
REDIS_URL=redis://127.0.0.1:6379
NODE_ENV=development
CORS_ORIGIN=*
PROXIMITY_RADIUS=100
```

### 3. Start the Server
```bash
# Production start
npm start

# Development with automatic file watching
npm run dev
```

### 4. Health Check
```bash
curl http://localhost:5000/health
```
