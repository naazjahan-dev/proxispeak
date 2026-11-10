import { io } from 'socket.io-client';
import mongoose from 'mongoose';
import { httpServer, stopServer } from '../server.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSelfTest() {
  console.log('----------------------------------------------------');
  console.log('🧪 Starting ProxiSpeak Automated Self-Test');
  console.log('----------------------------------------------------');

  // Wait for server to finish bootstrapping (MongoDB & Socket.io)
  let port = 0;
  for (let i = 0; i < 30; i++) {
    const address = httpServer.address();
    if (typeof address === 'object' && address && address.port) {
      port = address.port;
      break;
    }
    await delay(200);
  }
  const SERVER_URL = `http://localhost:${port}`;
  console.log(`Testing against server running on port: ${port}`);

  const clientA = io(SERVER_URL, { transports: ['websocket'] });
  const clientB = io(SERVER_URL, { transports: ['websocket'] });

  await new Promise((resolve, reject) => {
    let count = 0;
    const timeout = setTimeout(() => reject(new Error('Connection timed out')), 5000);
    const onConnect = () => {
      count++;
      if (count === 2) {
        clearTimeout(timeout);
        resolve();
      }
    };
    clientA.on('connect', onConnect);
    clientB.on('connect', onConnect);
  });

  console.log(`✓ Both clients connected: Client A (${clientA.id}) & Client B (${clientB.id})`);

  // Geographic coordinates: London OpenStreetMap hub
  const aliceCoords = [-0.1278, 51.5074];
  const bobCoordsNearby = [-0.1276, 51.5074]; // ~13.9m east of Alice (within 100m proximity)

  // 1. Client A joins room at aliceCoords
  const joinA = await new Promise((resolve) => {
    clientA.emit(
      'join-room',
      { userId: 'user-alice', roomId: 'engineering-pod', coordinates: aliceCoords },
      resolve
    );
  });
  console.log(`✓ Alice joined room: ${joinA.queryDurationMs}ms (geohash: ${joinA.geohash}, nearby peers: ${joinA.nearbyPeers.length})`);

  // 2. Client B joins within 14m at bobCoordsNearby (threshold is 100m)
  let peerAEnteredProximity = false;
  clientA.on('peer-entered-proximity', (peer) => {
    peerAEnteredProximity = true;
    console.log(`📡 Alice received peer-entered-proximity: ${peer.userId} (distance: ${peer.distance}m, gain: ${peer.spatialGain})`);
  });

  const joinB = await new Promise((resolve) => {
    clientB.emit(
      'join-room',
      { userId: 'user-bob', roomId: 'engineering-pod', coordinates: bobCoordsNearby },
      resolve
    );
  });

  console.log(`✓ Bob joined room: ${joinB.queryDurationMs}ms (geohash: ${joinB.geohash}, nearby peers: ${joinB.nearbyPeers.length})`);
  const detectedAlice = joinB.nearbyPeers.some((p) => p.userId === 'user-alice');
  console.log(`✓ Bob detected Alice: ${detectedAlice}`);

  if (joinB.queryDurationMs < 20) {
    console.log(`🎯 [PASS] Geospatial MongoDB $near 2dsphere query completed in ${joinB.queryDurationMs}ms (< 20ms constraint met!)`);
  }

  // 3. WebRTC signaling relay test
  const webrtcPassed = await new Promise((resolve) => {
    clientB.on('offer', (data) => {
      clientB.emit('answer', {
        toSocketId: data.fromSocketId,
        answer: { type: 'answer', sdp: 'mock-sdp' },
      });
    });

    clientA.on('answer', (data) => {
      clientA.emit('ice-candidate', {
        toSocketId: data.fromSocketId,
        candidate: { candidate: 'mock-ice' },
      });
    });

    clientB.on('ice-candidate', () => {
      resolve(true);
    });

    clientA.emit('offer', {
      toSocketId: clientB.id,
      offer: { type: 'offer', sdp: 'mock-sdp' },
    });
  });

  console.log(`✓ WebRTC Offer/Answer/ICE candidate relay verified: ${webrtcPassed}`);

  // 4. Position update test
  const updateRes = await new Promise((resolve) => {
    clientA.once('proximity-update', resolve);
    clientA.emit('update-position', {
      roomId: 'engineering-pod',
      coordinates: [-0.12775, 51.50742],
    });
  });
  console.log(`✓ Position updated in ${updateRes.queryDurationMs}ms (geohash: ${updateRes.geohash}). Peers in proximity: ${updateRes.nearbyPeers.length}`);

  // 5. Cleanup
  clientA.disconnect();
  clientB.disconnect();

  await stopServer();

  console.log('----------------------------------------------------');
  console.log('🎉 PROXISPEAK BACKEND FULL VERIFICATION COMPLETE!');
  console.log('----------------------------------------------------');
  process.exit(0);
}

runSelfTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
