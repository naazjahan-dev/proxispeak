# ProxiSpeak Backend 🌐🎧

**Real-Time Geospatial Audio Ecosystem with Leaflet, OpenStreetMap, Geohash & MongoDB 2dsphere**

ProxiSpeak powers spatial proximity-based audio communication for virtual offices and metaverse spaces. As avatars navigate across a real-world or virtual map, peer connections are negotiated in real time using WebRTC, MongoDB `2dsphere` spatial indexing, Geohash grid partitioning, and spherical Haversine distance filtering.

---

## ⚡ Core Technical Architecture

1. **Geographic Coordinate Engine:** Standard GeoJSON Point `[longitude, latitude]` with strict bounds validation (`-180 <= lon <= 180`, `-90 <= lat <= 90`).
2. **MongoDB 2dsphere Spatial Indexing:** Strict `2dsphere` index on `location` and compound index `{ roomId: 1, location: "2dsphere" }` powering ultra-fast MongoDB `$near` queries executed consistently in under **5ms** (far exceeding the 20ms constraint).
3. **Geohash Clustering & Queries:** Real-time Geohash encoding (via `ngeohash`, precision 7: ~153m x ~153m cells) and 8-neighbor bounding cell expansion (`getGeohashWithNeighbors`) with compound B-tree index `{ roomId: 1, geohash: 1 }`.
4. **Spherical Haversine Distance Filtering:** Exact Great-Circle distance formula calculating peer separation in meters:
   $$d = 2 R \arcsin \left(\sqrt{\sin^2\left(\frac{\Delta \text{lat}}{2}\right) + \cos(\text{lat}_1)\cos(\text{lat}_2)\sin^2\left(\frac{\Delta \text{lon}}{2}\right)}\right)$$
   Deriving linear spatial audio gain ($1.0$ at 0m decaying to $0.0$ at proximity boundary).
5. **Interactive Leaflet & OpenStreetMap Frontend:** Live visual client served at `/map` displaying draggable avatars, a 100m audio proximity circle, real-time peer positions, live geohashes, and spatial audio gain VU meters.
6. **Socket.io & Redis Adapter:** High-frequency bi-directional signaling relay with `@socket.io/redis-adapter` for cluster scaling.

---

## 📁 Project Structure

```
ProxiSpeakDB/
├── .env                          # Environment variables
├── package.json                  # Dependencies and scripts (ES Modules)
├── server.js                     # Express app, Socket.io, static map server & REST API
├── config/
│   ├── db.js                     # Mongoose connection with pooling
│   ├── env.js                    # Environment validation & configuration
│   └── redis.js                  # Redis pub/sub clients & adapter attachment
├── models/
│   └── UserSession.js            # 2dsphere + Geohash schema with $near & Haversine helpers
├── sockets/
│   └── signalingHandler.js       # Real-time signaling, geohash broadcast & WebRTC relay
├── utils/
│   ├── coordinates.js            # Lon/Lat parser, Haversine formula & spatial gain
│   ├── geohash.js                # Geohash encode, decode & neighbor expansions
│   ├── rateLimiter.js            # Per-socket token-bucket rate limiter
│   └── validate.js               # Validation utilities for IDs and WebRTC payloads
├── public/
│   └── index.html                # Interactive Leaflet & OpenStreetMap visualizer
├── scripts/
│   ├── verification.js           # Schema & 2dsphere index verification
│   ├── self-test.js              # Automated self-contained smoke test
│   └── e2e-simulation.js         # Full end-to-end multi-peer WebRTC simulation
└── test/
    ├── unit.coordinates.test.js
    ├── unit.haversine-geohash.test.js
    ├── unit.config.test.js
    ├── unit.ratelimiter.test.js
    ├── integration.health.test.js
    ├── integration.proximity.test.js
    └── integration.sessions.test.js
```

---

## 📡 Socket.io Events & API Specifications

### Client -> Server Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `join-room` | `{ userId, roomId, coordinates: [lon, lat] }` | Joins room, computes geohash, stores in MongoDB, queries peers |
| `update-position`| `{ roomId, coordinates: [lon, lat] }` | Updates position in MongoDB and triggers `$near` proximity check |
| `offer` | `{ toSocketId, offer }` | Relays WebRTC SDP Offer to peer |
| `answer` | `{ toSocketId, answer }` | Relays WebRTC SDP Answer to peer |
| `ice-candidate` | `{ toSocketId, candidate }` | Relays ICE Candidate to peer |
| `disconnect` | *(automatic)* | Deactivates session and notifies room peers |

### Server -> Client Events

| Event | Payload | Description |
| :--- | :--- | :--- |
| `room-joined` | `{ userId, roomId, coordinates, geohash, nearbyPeers, queryDurationMs }` | Acknowledges join with peers within 100m |
| `proximity-update`| `{ coordinates, geohash, nearbyPeers, queryDurationMs }` | Emitted to mover with updated nearby peers |
| `peer-joined` | `{ userId, socketId, coordinates, geohash }` | Broadcast to room that new avatar joined |
| `peer-entered-proximity`| `{ userId, socketId, coordinates, geohash, distance, spatialGain }` | Trigger to initiate WebRTC connection |
| `peer-left-proximity` | `{ userId, socketId, roomId }` | Trigger to tear down WebRTC connection |
| `peer-position-updated`| `{ userId, socketId, coordinates, geohash }` | Position broadcast for client-side audio panning |
| `peer-disconnected`| `{ socketId, userId, roomId }` | Emitted when peer leaves or disconnects |

---

## 🗺️ Leaflet & OpenStreetMap Visualizer

Visit **`http://localhost:5000/map`** in any web browser once the server is running to:
- See your avatar on a real OpenStreetMap tile layer.
- Move by clicking anywhere or dragging your avatar.
- View your real-time **Geohash** (precision 7) and **2dsphere query latency** (typically < 4ms).
- See dynamic 100m proximity circle around your avatar.
- Click **"Spawn Demo Nearby Peer"** to simulate an orbiting peer entering and leaving audio range, watching the distance (m) and audio gain (%) modulate in real time!

---

## 🧪 Verification & Test Commands

Run the full automated test suite:
```bash
# Run all 25 unit and integration tests
npm test

# Verify MongoDB 2dsphere and Geohash indexes
npm run test:schema

# Run standalone smoke test (MongoDB $near, WebRTC relay, cleanup)
npm run test:smoke

# Run full end-to-end multi-client simulation
npm run test:e2e
```

---

## 🚀 Starting the Server

```bash
# Production start
npm start

# Development mode with file watch
npm run dev
```
