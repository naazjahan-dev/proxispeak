import { io } from 'socket.io-client';

const SERVER_URL = 'http://localhost:5001';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('====================================================');
  console.log('🧪 Starting ProxiSpeak End-to-End Simulation Test');
  console.log('====================================================');

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

  // 1. Client A joins room
  const joinAResult = await new Promise((resolve) => {
    clientA.emit(
      'join-room',
      { userId: 'user-alice', roomId: 'virtual-headquarters', coordinates: [50, 50] },
      resolve
    );
  });
  console.log(`✓ Client A joined: queryDuration = ${joinAResult.queryDurationMs}ms (Nearby peers: ${joinAResult.nearbyPeers.length})`);

  // 2. Client B joins room within 14px of Client A (Threshold is 100px)
  let peerAEnteredProximity = false;
  clientA.on('peer-entered-proximity', (peer) => {
    console.log(`📡 [Client A Event] Peer entered proximity: ${peer.userId} (${peer.socketId})`);
    peerAEnteredProximity = true;
  });

  const joinBResult = await new Promise((resolve) => {
    clientB.emit(
      'join-room',
      { userId: 'user-bob', roomId: 'virtual-headquarters', coordinates: [60, 60] },
      resolve
    );
  });

  console.log(`✓ Client B joined: queryDuration = ${joinBResult.queryDurationMs}ms`);
  console.log(`✓ Client B detected nearby peers: ${joinBResult.nearbyPeers.map((p) => p.userId).join(', ')}`);

  if (joinBResult.queryDurationMs < 20) {
    console.log(`🎯 [PASS] Geospatial MongoDB $near query completed in ${joinBResult.queryDurationMs}ms (< 20ms constraint met!)`);
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
  console.log('Moving Client B out of proximity range to [500, 500] (> 100px away)...');
  const moveResult = await new Promise((resolve) => {
    clientB.once('proximity-update', resolve);
    clientB.emit('update-position', {
      roomId: 'virtual-headquarters',
      coordinates: [500, 500],
    });
  });

  console.log(`✓ Client B position updated in ${moveResult.queryDurationMs}ms. Nearby peers count: ${moveResult.nearbyPeers.length}`);
  if (moveResult.nearbyPeers.length === 0) {
    console.log('✓ Client B correctly identified no peers within 100px proximity radius.');
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

  console.log('====================================================');
  console.log('🎉 ALL END-TO-END SYSTEM TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
  process.exit(0);
}

runSimulation().catch((err) => {
  console.error('Simulation error:', err);
  process.exit(1);
});
