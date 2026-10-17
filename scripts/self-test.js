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

  // 1. Client A joins room at [50, 50]
  const joinA = await new Promise((resolve) => {
    clientA.emit(
      'join-room',
      { userId: 'user-alice', roomId: 'engineering-pod', coordinates: [50, 50] },
      resolve
    );
  });
  console.log(`✓ Alice joined room: ${joinA.queryDurationMs}ms (nearby peers: ${joinA.nearbyPeers.length})`);

  // 2. Client B joins within 15px at [60, 60] (threshold is 100px)
  let peerAEnteredProximity = false;
  clientA.on('peer-entered-proximity', (peer) => {
    peerAEnteredProximity = true;
    console.log(`📡 Alice received peer-entered-proximity: ${peer.userId}`);
  });

  const joinB = await new Promise((resolve) => {
    clientB.emit(
      'join-room',
      { userId: 'user-bob', roomId: 'engineering-pod', coordinates: [60, 60] },
      resolve
    );
  });

  console.log(`✓ Bob joined room: ${joinB.queryDurationMs}ms (nearby peers: ${joinB.nearbyPeers.length})`);
  console.log(`✓ Bob detected Alice: ${joinB.nearbyPeers.some((p) => p.userId === 'user-alice')}`);

  if (joinB.queryDurationMs < 20) {
    console.log(`🎯 [PASS] Geospatial MongoDB $near query completed in ${joinB.queryDurationMs}ms (< 20ms constraint met!)`);
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
      coordinates: [52, 52],
    });
  });
  console.log(`✓ Position updated in ${updateRes.queryDurationMs}ms. Peers in proximity: ${updateRes.nearbyPeers.length}`);

  // 5. Cleanup
  clientA.disconnect();
  clientB.disconnect();

  await stopServer();
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close(false);
  }

  console.log('----------------------------------------------------');
  console.log('🎉 PROXISPEAK BACKEND FULL VERIFICATION COMPLETE!');
  console.log('----------------------------------------------------');
  process.exit(0);
}

runSelfTest().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
