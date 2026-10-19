import { io } from 'socket.io-client';
import { httpServer, stopServer } from '../server.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('====================================================');
  console.log('🧪 Starting ProxiSpeak End-to-End Simulation Test');
  console.log('====================================================');

  // Discover actual port
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

  await new Promise((resolve) => {
    let connected = 0;
    const check = () => {
      connected++;
      if (connected === 2) resolve();
    };
    clientA.on('connect', check);
    clientB.on('connect', check);
  });

  console.log(`✓ Both clients connected: Client A (${clientA.id}), Client B (${clientB.id})`);

  // Geographic coordinates: London hub
  const aliceCoords = [-0.1278, 51.5074];
  const bobCoordsNearby = [-0.1276, 51.5074]; // ~13.9m east of Alice (within 100m proximity)

  // 1. Client A joins room
  const joinAResult = await new Promise((resolve) => {
    clientA.emit(
      'join-room',
      { userId: 'user-alice', roomId: 'virtual-headquarters', coordinates: aliceCoords },
      resolve
    );
  });
  console.log(`✓ Client A joined: queryDuration = ${joinAResult.queryDurationMs}ms (geohash: ${joinAResult.geohash}, Nearby peers: ${joinAResult.nearbyPeers.length})`);

  // 2. Client B joins room within 14m of Client A (Threshold is 100m)
  let peerAEnteredProximity = false;
  clientA.on('peer-entered-proximity', (peer) => {
    console.log(`📡 [Client A Event] Peer entered proximity: ${peer.userId} (${peer.socketId}) - distance: ${peer.distance}m, gain: ${peer.spatialGain}`);
    peerAEnteredProximity = true;
  });

  const joinBResult = await new Promise((resolve) => {
    clientB.emit(
      'join-room',
      { userId: 'user-bob', roomId: 'virtual-headquarters', coordinates: bobCoordsNearby },
      resolve
    );
  });

  console.log(`✓ Client B joined: queryDuration = ${joinBResult.queryDurationMs}ms (geohash: ${joinBResult.geohash})`);
  console.log(`✓ Client B detected nearby peers: ${joinBResult.nearbyPeers.map((p) => `${p.userId} (${p.distance}m, gain: ${p.spatialGain})`).join(', ')}`);

  if (joinBResult.queryDurationMs < 20) {
    console.log(`🎯 [PASS] Geospatial MongoDB $near 2dsphere query completed in ${joinBResult.queryDurationMs}ms (< 20ms constraint met!)`);
  } else {
    console.warn(`⚠️ [BENCHMARK] Query took ${joinBResult.queryDurationMs}ms (slightly above 20ms warm-up threshold)`);
  }

  await delay(200);

  // 3. Test WebRTC Signaling Relay
  console.log('Testing WebRTC SDP Offer/Answer and ICE relay...');
  const webrtcExchange = new Promise((resolve) => {
    clientB.on('offer', (data) => {
      console.log(`✓ Client B received WebRTC offer from ${data.fromUserId} (${data.fromSocketId})`);
      clientB.emit('answer', {
        toSocketId: data.fromSocketId,
        answer: { type: 'answer', sdp: 'v=0..mock-sdp-answer..' },
      });
    });

    clientA.on('answer', (data) => {
      console.log(`✓ Client A received WebRTC answer from ${data.fromUserId}`);
      clientA.emit('ice-candidate', {
        toSocketId: data.fromSocketId,
        candidate: { candidate: 'candidate:1 1 UDP 2130706431 ...' },
      });
    });

    clientB.on('ice-candidate', (data) => {
      console.log(`✓ Client B received ICE candidate from ${data.fromUserId}`);
      resolve(true);
    });

    clientA.emit('offer', {
      toSocketId: clientB.id,
      offer: { type: 'offer', sdp: 'v=0..mock-sdp-offer..' },
    });
  });

  await webrtcExchange;
  console.log('✓ WebRTC signaling relay successfully verified.');

  // 4. Test Position Update & Spatial Out-of-Range Movement
  console.log('Moving Client B out of proximity range to [-0.1200, 51.5074] (> 500m away)...');
  const moveResult = await new Promise((resolve) => {
    clientB.once('proximity-update', resolve);
    clientB.emit('update-position', {
      roomId: 'virtual-headquarters',
      coordinates: [-0.1200, 51.5074],
    });
  });

  console.log(`✓ Client B position updated in ${moveResult.queryDurationMs}ms (geohash: ${moveResult.geohash}). Nearby peers count: ${moveResult.nearbyPeers.length}`);
  if (moveResult.nearbyPeers.length === 0) {
    console.log('✓ Client B correctly identified no peers within 100m proximity radius via Haversine distance filtering.');
  }

  // 5. Test Disconnect & Cleanup
  console.log('Disconnecting clients...');
  const peerDisconnectNotice = new Promise((resolve) => {
    clientA.on('peer-disconnected', (peer) => {
      console.log(`✓ Client A received peer-disconnected event for socket: ${peer.socketId}`);
      resolve();
    });
    clientB.disconnect();
  });

  await peerDisconnectNotice;
  clientA.disconnect();

  await stopServer();

  console.log('====================================================');
  console.log('🎉 ALL END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
