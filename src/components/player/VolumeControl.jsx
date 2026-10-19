import React from 'react';
import { Volume2, Volume1, VolumeX } from 'lucide-react';

export default function VolumeControl({ volume, isMuted, onVolumeChange, onToggleMute }) {
  const getVolumeIcon = () => {
    if (isMuted || volume === 0) {
      return <VolumeX size={18} color="var(--status-rose)" />;
    }
    if (volume < 0.5) {
      return <Volume1 size={18} color="var(--accent-cyan)" />;
    }
    return <Volume2 size={18} color="var(--accent-cyan)" />;
  };

  const currentDisplayVolume = isMuted ? 0 : Math.round(volume * 100);

  return (
    <div className="volume-control-container" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        type="button"
        className="btn-icon"
        onClick={onToggleMute}
        title={isMuted ? 'Unmute audio' : 'Mute audio'}
        aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
      >
        {getVolumeIcon()}
      </button>

      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '85px' }}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={isMuted ? 0 : volume}
          onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
          style={{
            width: '100%',
            height: '4px',
            borderRadius: '2px',
            background: `linear-gradient(to right, var(--accent-cyan) 0%, var(--accent-cyan) ${currentDisplayVolume}%, var(--bg-surface-hover) ${currentDisplayVolume}%, var(--bg-surface-hover) 100%)`,
            appearance: 'none',
            outline: 'none',
            cursor: 'pointer'
          }}
          aria-label="Volume slider"
        />
      </div>

      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', minWidth: '32px', textAlign: 'right' }}>
        {currentDisplayVolume}%
      </span>
    </div>
  );
}
