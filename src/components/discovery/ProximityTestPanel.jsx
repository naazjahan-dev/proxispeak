import React, { useState } from 'react';
import { 
  Play, 
  CornerDownRight, 
  Send, 
  Sliders, 
  Radio, 
  ChevronDown, 
  ChevronUp, 
  Trash2,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { emitProximityEvent, simulateMockEnter, simulateMockExit } from '../../services/proximityEventAdapter';

export default function ProximityTestPanel({ cardsCount = 0, onClearCards }) {
  const [isOpen, setIsOpen] = useState(false);
  const [customId, setCustomId] = useState('audio-001');
  const [customDistance, setCustomDistance] = useState(35);
  const [customTitle, setCustomTitle] = useState('');
  const [logs, setLogs] = useState([]);

  const addLog = (msg, type = 'info') => {
    setLogs(prev => [{
      id: Date.now(),
      time: new Date().toLocaleTimeString(),
      msg,
      type
    }, ...prev.slice(0, 14)]);
  };

  // Quick preset triggers
  const handleTriggerEnter = (id, distance, title = undefined) => {
    const success = emitProximityEvent({
      type: 'ENTER',
      audioId: id,
      distance,
      title: title || undefined
    });
    if (success) {
      addLog(`ENTER dispatched for [${id}] at ${distance}m`, 'enter');
    }
  };

  const handleTriggerExit = (id) => {
    const success = simulateMockExit(id);
    if (success) {
      addLog(`EXIT dispatched for [${id}]`, 'exit');
    }
  };

  const handleCustomSubmit = (type) => {
    if (!customId) return;
    const success = emitProximityEvent({
      type,
      audioId: customId,
      distance: Number(customDistance) || 50,
      title: customTitle.trim() || undefined
    });
    if (success) {
      addLog(`${type} [${customId}] (${customDistance}m)`, type.toLowerCase());
    }
  };

  return (
    <div 
      className="card-panel proximity-test-panel"
      style={{
        marginTop: '24px',
        border: '1px dashed var(--accent-cyan)',
        background: 'rgba(6, 182, 212, 0.04)',
        padding: '16px'
      }}
    >
      {/* Header with Toggle */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="badge badge-cyan">
            <Sliders size={12} />
            <span>Dev Geolocation Event Simulator</span>
          </div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Simulate teammate's ENTER/EXIT events ({cardsCount} in range)
          </span>
        </div>
        <button type="button" className="btn-icon" aria-label="Toggle simulator panel">
          {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
      </div>

      {isOpen && (
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            Click any preset node below to simulate your teammate's geolocation module generating an <code>ENTER</code> or <code>EXIT</code> event. 
            Verify that audio cards appear automatically, metadata loads, and audio plays only on explicit user click.
          </p>

          {/* Quick Trigger Buttons Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Node 001: Rainforest (25m)</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline-cyan" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem', flex: 1 }}
                  onClick={() => handleTriggerEnter('audio-001', 25)}
                >
                  ENTER
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => handleTriggerExit('audio-001')}
                >
                  EXIT
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Node 002: Clocktower (75m)</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline-cyan" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem', flex: 1 }}
                  onClick={() => handleTriggerEnter('audio-002', 75)}
                >
                  ENTER
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => handleTriggerExit('audio-002')}
                >
                  EXIT
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Node 003: Sub-Bass Metro (120m)</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline-cyan" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem', flex: 1 }}
                  onClick={() => handleTriggerEnter('audio-003', 120)}
                >
                  ENTER
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => handleTriggerExit('audio-003')}
                >
                  EXIT
                </button>
              </div>
            </div>

            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px', color: 'var(--status-rose)' }}>Node 009: Broken URL Error Test</div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button 
                  type="button" 
                  className="btn btn-outline-cyan" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem', flex: 1 }}
                  onClick={() => handleTriggerEnter('audio-009', 40)}
                >
                  ENTER
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ padding: '6px 10px', fontSize: '0.78rem' }}
                  onClick={() => handleTriggerExit('audio-009')}
                >
                  EXIT
                </button>
              </div>
            </div>
          </div>

          {/* Custom Event Builder */}
          <div style={{ background: 'var(--bg-secondary)', padding: '12px', borderRadius: 'var(--radius-md)', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '8px' }}>Custom Event Payload Builder</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="Audio ID (e.g. audio-004)"
                value={customId}
                onChange={(e) => setCustomId(e.target.value)}
                className="input-field"
                style={{ flex: '1', minWidth: '130px', padding: '6px 10px', fontSize: '0.82rem' }}
              />
              <input
                type="number"
                placeholder="Distance (m)"
                value={customDistance}
                onChange={(e) => setCustomDistance(e.target.value)}
                className="input-field"
                style={{ width: '100px', padding: '6px 10px', fontSize: '0.82rem' }}
              />
              <input
                type="text"
                placeholder="Optional Title (tests missing metadata)"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="input-field"
                style={{ flex: '2', minWidth: '160px', padding: '6px 10px', fontSize: '0.82rem' }}
              />
              <button 
                type="button" 
                className="btn btn-primary"
                onClick={() => handleCustomSubmit('ENTER')}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Send ENTER
              </button>
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => handleCustomSubmit('EXIT')}
                style={{ padding: '6px 14px', fontSize: '0.82rem' }}
              >
                Send EXIT
              </button>
            </div>
          </div>

          {/* Footer Controls & Log */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Event Dispatch Log</span>
            {onClearCards && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onClearCards}
                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
              >
                <Trash2 size={12} />
                <span>Clear All Active Cards</span>
              </button>
            )}
          </div>

          <div 
            style={{ 
              background: 'var(--bg-primary)', 
              padding: '8px 12px', 
              borderRadius: 'var(--radius-sm)', 
              maxHeight: '110px', 
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '0.75rem'
            }}
          >
            {logs.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>No events simulated yet. Click a preset button above to emit an event.</span>
            ) : (
              logs.map(log => (
                <div key={log.id} style={{ display: 'flex', gap: '8px', marginBottom: '2px', color: log.type === 'enter' ? 'var(--accent-cyan)' : 'var(--status-amber)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>[{log.time}]</span>
                  <span>{log.msg}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
