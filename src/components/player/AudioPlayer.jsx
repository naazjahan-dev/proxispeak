import React from 'react';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  RotateCcw, 
  RotateCw, 
  Volume2, 
  X, 
  Minimize2, 
  Radio, 
  MapPin, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { formatTime } from '../../utils/formatTime';
import { formatDistance } from '../../utils/calculateDistance';
import VolumeControl from './VolumeControl';

export default function AudioPlayer() {
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
    isExpanded,
    setIsExpanded,
    togglePlayPause,
    seekTo,
    setAudioVolume,
    toggleMute,
    playNext,
    playPrevious
  } = useAudio();

  if (!isExpanded || !currentTrack) {
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
      className="audio-player-modal-backdrop"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(6, 11, 20, 0.85)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={() => setIsExpanded(false)}
    >
      <div 
        className="card-panel audio-player-modal-content"
        style={{
          width: '100%',
          maxWidth: '540px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-medium)',
          boxShadow: 'var(--shadow-lg), var(--shadow-cyan-glow)',
          padding: '32px',
          borderRadius: 'var(--radius-lg)',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Badge & Close */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div className="badge badge-cyan">
            <Radio size={12} className="animate-pulse" />
            <span>Active Sound Node</span>
          </div>

          <button
            type="button"
            className="btn-icon"
            onClick={() => setIsExpanded(false)}
            aria-label="Close expanded audio player"
          >
            <Minimize2 size={20} />
          </button>
        </div>

        {/* Big Artwork & Waveform Avatar */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '28px' }}>
          <div 
            style={{
              width: '160px',
              height: '160px',
              borderRadius: 'var(--radius-lg)',
              background: currentTrack.coverColor 
                ? `linear-gradient(135deg, ${currentTrack.coverColor}44, ${currentTrack.coverColor}11)`
                : 'linear-gradient(135deg, rgba(6, 182, 212, 0.25), rgba(59, 130, 246, 0.15))',
              border: `2px solid ${currentTrack.coverColor || 'var(--accent-cyan)'}66`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: currentTrack.coverColor || 'var(--accent-cyan)',
              marginBottom: '20px',
              boxShadow: '0 8px 32px -4px rgba(6, 182, 212, 0.25)'
            }}
          >
            <Radio size={64} className={isPlaying ? 'animate-pulse' : ''} />
          </div>

          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, textAlign: 'center', marginBottom: '6px' }}>
            {currentTrack.title}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginBottom: '10px' }}>
            {currentTrack.author || currentTrack.category || 'Geospatial Audio Ecosystem'}
          </p>

          {/* Coordinates & Distance Badge */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
            {currentTrack.distance !== undefined && currentTrack.distance !== null && (
              <div className="badge badge-emerald">
                <MapPin size={12} />
                <span>{formatDistance(currentTrack.distance > 50 ? currentTrack.distance / 1000 : currentTrack.distance)}</span>
              </div>
            )}
            {currentTrack.category && (
              <div className="badge badge-cyan">
                <span>{currentTrack.category}</span>
              </div>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {isError && (
          <div 
            style={{
              padding: '10px 14px',
              background: 'rgba(244, 63, 94, 0.12)',
              border: '1px solid rgba(244, 63, 94, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginBottom: '20px',
              color: 'var(--status-rose)',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <AlertCircle size={16} />
            <span>{errorMessage || 'Audio playback stream failed.'}</span>
          </div>
        )}

        {/* Scrub Bar */}
        <div style={{ marginBottom: '24px' }}>
          <div 
            onClick={handleSeek}
            style={{
              height: '8px',
              background: 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
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
                borderRadius: 'var(--radius-full)',
                transition: 'width 100ms linear'
              }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Transport Controls */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px', marginBottom: '28px' }}>
          <button
            type="button"
            className="btn-icon"
            onClick={playPrevious}
            title="Previous track"
            aria-label="Previous track"
          >
            <SkipBack size={22} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => seekTo(Math.max(0, currentTime - 10))}
            title="Rewind 10 seconds"
            aria-label="Rewind 10 seconds"
          >
            <RotateCcw size={20} />
          </button>

          <button
            type="button"
            className="btn btn-primary"
            onClick={togglePlayPause}
            disabled={isLoading}
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              padding: 0
            }}
            aria-label={isPlaying ? 'Pause' : 'Play'}
          >
            {isLoading ? (
              <Loader2 size={24} className="animate-spin" />
            ) : isPlaying ? (
              <Pause size={24} />
            ) : (
              <Play size={24} style={{ marginLeft: '3px' }} />
            )}
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={() => seekTo(Math.min(duration || currentTime + 10, currentTime + 10))}
            title="Fast-forward 10 seconds"
            aria-label="Fast-forward 10 seconds"
          >
            <RotateCw size={20} />
          </button>

          <button
            type="button"
            className="btn-icon"
            onClick={playNext}
            title="Next track"
            aria-label="Next track"
          >
            <SkipForward size={22} />
          </button>
        </div>

        {/* Bottom Volume Slider */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={setAudioVolume}
            onToggleMute={toggleMute}
          />
        </div>
      </div>
    </div>
  );
}
