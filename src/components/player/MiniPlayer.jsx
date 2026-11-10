import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  Radio, 
  Maximize2, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { formatTime } from '../../utils/formatTime';
import VolumeControl from './VolumeControl';

export default function MiniPlayer() {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    isError,
    errorMessage,
    currentTime,
    duration,
    volume,
    isMuted,
    togglePlayPause,
    seekTo,
    setAudioVolume,
    toggleMute,
    playNext,
    playPrevious,
    setIsExpanded
  } = useAudio();

  // If no track has been loaded or selected yet, do not render floating dock
  if (!currentTrack) {
    return null;
  }

  const handleSeek = (e) => {
    if (!duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(percentage * duration);
  };

  const progressPercent = duration > 0 
    ? Math.min(100, (currentTime / duration) * 100) 
    : 0;

  return (
    <div 
      className="mini-player-container"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: 'var(--mini-player-height)',
        background: 'rgba(10, 18, 33, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid var(--border-medium)',
        boxShadow: 'var(--shadow-player)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000
      }}
    >
      {/* Top Scrub Bar */}
      <div 
        onClick={handleSeek}
        style={{
          width: '100%',
          height: '4px',
          background: 'var(--bg-surface-hover)',
          cursor: 'pointer',
          position: 'relative'
        }}
        title="Click to seek playback position"
        role="progressbar"
        aria-valuenow={progressPercent}
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div 
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--accent-cyan), var(--accent-blue))',
            position: 'relative',
            transition: 'width 100ms linear'
          }}
        >
          <div 
            style={{
              position: 'absolute',
              right: '-4px',
              top: '-3px',
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: '#ffffff',
              boxShadow: '0 0 6px var(--accent-cyan)'
            }}
          />
        </div>
      </div>

      {/* Main Bar Content */}
      <div 
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          gap: '16px'
        }}
      >
        {/* Left: Track Information */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px', maxWidth: '320px' }}>
          <div 
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              background: currentTrack.coverColor 
                ? `linear-gradient(135deg, ${currentTrack.coverColor}44, ${currentTrack.coverColor}11)`
                : 'rgba(6, 182, 212, 0.15)',
              border: `1px solid ${currentTrack.coverColor || 'var(--accent-cyan)'}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentTrack.coverColor || 'var(--accent-cyan)',
              flexShrink: 0
            }}
          >
            <Radio size={20} className={isPlaying ? 'animate-pulse' : ''} />
          </div>

          <div style={{ minWidth: 0, overflow: 'hidden' }}>
            <div 
              style={{
                fontSize: '0.9rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={currentTrack.title}
            >
              {currentTrack.title}
            </div>
            <div 
              style={{
                fontSize: '0.75rem',
                color: 'var(--text-muted)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              {currentTrack.author || currentTrack.category || 'Proximity Node'}
            </div>
          </div>
        </div>

        {/* Center: Playback Controls & Timestamps */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1, maxWidth: '440px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn-icon"
              onClick={playPrevious}
              title="Previous audio node"
              aria-label="Previous audio node"
            >
              <SkipBack size={18} />
            </button>

            <button
              type="button"
              className="btn btn-primary"
              onClick={togglePlayPause}
              disabled={isLoading}
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                padding: 0
              }}
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isLoading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : isPlaying ? (
                <Pause size={18} />
              ) : (
                <Play size={18} style={{ marginLeft: '2px' }} />
              )}
            </button>

            <button
              type="button"
              className="btn-icon"
              onClick={playNext}
              title="Next audio node"
              aria-label="Next audio node"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>/</span>
            <span>{formatTime(duration)}</span>
            {isError && (
              <span style={{ color: 'var(--status-rose)', display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '6px' }}>
                <AlertCircle size={12} />
                <span>Stream error</span>
              </span>
            )}
          </div>
        </div>

        {/* Right: Volume & Expand Full Player */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '180px', justifyContent: 'flex-end' }}>
          <div className="mini-player-volume-wrapper">
            <VolumeControl
              volume={volume}
              isMuted={isMuted}
              onVolumeChange={setAudioVolume}
              onToggleMute={toggleMute}
            />
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={() => setIsExpanded(true)}
            title="Expand detailed player"
            aria-label="Expand detailed player"
          >
            <Maximize2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
