import React from 'react';
import { Radio, Loader2, Sparkles } from 'lucide-react';
import useProximityAudio from '../../hooks/useProximityAudio';
import AudioCard from './AudioCard';
import ProximityTestPanel from './ProximityTestPanel';

export default function ProximityAudioListener({ showTestPanel = true }) {
  const {
    cards,
    loadingMap,
    dismissCard,
    clearAllCards,
    retryFetch
  } = useProximityAudio();

  const loadingIds = Object.keys(loadingMap);

  return (
    <section className="proximity-audio-listener-section" style={{ marginBottom: '28px' }}>
      {/* Active In-Range Audio Cards Header */}
      {cards.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="badge badge-cyan">
              <span className="pulse-dot" />
              <Radio size={12} />
              <span>Proximity Audio Detected</span>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              {cards.length} {cards.length === 1 ? 'audio node' : 'audio nodes'} detected in range
            </span>
          </div>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={clearAllCards}
            style={{ padding: '4px 10px', fontSize: '0.75rem' }}
          >
            Dismiss All
          </button>
        </div>
      )}

      {/* Loading Placeholders for Incomplete Events */}
      {loadingIds.map(id => (
        <div 
          key={`loading-${id}`}
          className="card-panel"
          style={{ 
            padding: '16px', 
            marginBottom: '14px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px dashed var(--accent-cyan)'
          }}
        >
          <Loader2 size={20} className="animate-spin" color="var(--accent-cyan)" />
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Fetching Audio Node [{id}] Details...</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Resolving stream URL and coordinate metadata</div>
          </div>
        </div>
      ))}

      {/* Render Active In-Range Audio Cards */}
      <div className="proximity-cards-list">
        {cards.map(card => (
          <AudioCard
            key={card.id}
            audio={card}
            onDismiss={dismissCard}
            onRetry={retryFetch}
          />
        ))}
      </div>

      {/* Developer Mock Geolocation Event Simulator Panel */}
      {showTestPanel && (
        <ProximityTestPanel
          cardsCount={cards.length}
          onClearCards={clearAllCards}
        />
      )}
    </section>
  );
}
