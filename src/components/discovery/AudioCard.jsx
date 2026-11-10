import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Radio, 
  MapPin, 
  X, 
  Loader2, 
  AlertCircle, 
  RotateCw,
  Volume2,
  Compass
} from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import { formatTime } from '../../utils/formatTime';
import { formatDistance } from '../../utils/calculateDistance';

export default function AudioCard({
  audio,
  onDismiss,
  onRetry,
  compact = false
}) {
  const [narrationLanguage, setNarrationLanguage] = useState('hi-IN');
  const [isNarrating, setIsNarrating] = useState(false);
  const speakPlace = () => {
    if (!('speechSynthesis' in window)) { alert('Text-to-speech is not supported in this browser.'); return; }
    window.speechSynthesis.cancel();
    const text = narrationLanguage === 'hi-IN' ? `${audio.title}. ${audio.descriptionHi || audio.description} ${audio.history || ''}` : `${audio.title}. ${audio.description} ${audio.history || ''}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = narrationLanguage; utterance.rate = 0.92;
    utterance.onstart = () => setIsNarrating(true); utterance.onend = () => setIsNarrating(false); utterance.onerror = () => setIsNarrating(false);
    window.speechSynthesis.speak(utterance);
  };
  const stopNarration = () => { window.speechSynthesis?.cancel(); setIsNarrating(false); };
  const {
    currentTrack,
    isPlaying,
    isLoading: isAudioLoading,
    isError: isAudioError,
    errorMessage: audioErrorMessage,
    currentTime,
    duration,
    playTrack,
    togglePlayPause,
    seekTo
  } = useAudio();

  if (!audio) return null;

  const isCurrentAudio = currentTrack && currentTrack.id === audio.id;
  const isThisPlaying = isCurrentAudio && isPlaying;
  const isThisLoading = isCurrentAudio && isAudioLoading;
  const hasPlaybackError = isCurrentAudio && isAudioError;

  // Handle Play/Pause user click
  const handlePlayToggle = (e) => {
    e.stopPropagation();
    if (isCurrentAudio) {
      togglePlayPause();
    } else {
      playTrack(audio);
    }
  };

  // Handle progress bar scrubbing
  const handleSeek = (e) => {
    e.stopPropagation();
    if (!isCurrentAudio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, clickX / rect.width));
    seekTo(percentage * duration);
  };

  const progressPercent = isCurrentAudio && duration > 0 
    ? Math.min(100, (currentTime / duration) * 100) 
    : 0;

  // Format distance
  let distanceDisplay = null;
  if (audio.distance !== undefined && audio.distance !== null) {
    // If distance is passed in meters or km
    const distKm = audio.distance > 50 ? audio.distance / 1000 : audio.distance;
    distanceDisplay = formatDistance(distKm);
  }

  return (
    <div 
      className={`card-panel proximity-audio-card ${isThisPlaying ? 'is-playing' : ''} ${!audio.inRange ? 'out-of-range' : ''}`}
      style={{
        position: 'relative',
        padding: '20px',
        marginBottom: '16px',
        border: isThisPlaying 
          ? '1px solid var(--accent-cyan)' 
          : '1px solid var(--border-subtle)',
        boxShadow: isThisPlaying ? '0 0 24px -2px var(--accent-cyan-glow)' : 'var(--shadow-md)',
        transition: 'all var(--transition-normal)',
        background: isThisPlaying 
          ? 'linear-gradient(135deg, rgba(18, 28, 51, 0.95), rgba(6, 182, 212, 0.08))' 
          : 'var(--bg-glass-card)'
      }}
    >
      {/* Top Bar: In-Range / Out-of-Range Badge & Dismiss Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Proximity Range Status */}
          {audio.inRange !== false ? (
            <div className="badge badge-cyan" title="Currently within trigger radius">
              <span className="pulse-dot" style={{ width: '6px', height: '6px' }} />
              <Radio size={12} />
              <span>In Range</span>
            </div>
          ) : (
            <div className="badge badge-amber" title="User moved outside trigger radius">
              <Compass size={12} />
              <span>Out of Range</span>
            </div>
          )}

          {/* Distance Indicator */}
          {distanceDisplay && (
            <div className="badge badge-emerald" title="Calculated distance from user">
              <MapPin size={12} />
              <span>{distanceDisplay}</span>
            </div>
          )}

          {/* Category Tag */}
          {audio.category && (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {audio.category}
            </span>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            type="button"
            className="btn-icon"
            onClick={(e) => {
              e.stopPropagation();
              onDismiss(audio.id);
            }}
            title="Dismiss this proximity card"
            aria-label="Dismiss audio card"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      {/* Main Content: Title, Description & Artwork */}
      <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginBottom: '16px' }}>
        {/* Glowing Icon / Avatar */}
        <div 
          style={{
            width: '48px',
            height: '48px',
            borderRadius: 'var(--radius-md)',
            background: audio.coverColor 
              ? `linear-gradient(135deg, ${audio.coverColor}44, ${audio.coverColor}11)`
              : 'rgba(6, 182, 212, 0.15)',
            border: `1px solid ${audio.coverColor || 'var(--accent-cyan)'}55`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: audio.coverColor || 'var(--accent-cyan)',
            flexShrink: 0
          }}
        >
          {isThisPlaying ? (
            <Volume2 size={24} className="animate-pulse" />
          ) : (
            <Radio size={24} />
          )}
        </div>

        {/* Text Details */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{ 
            fontSize: '1.05rem', 
            fontWeight: 700, 
            marginBottom: '4px',
            color: 'var(--text-primary)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {audio.title || 'Nearby Soundscape Node'}
          </h4>
          {audio.city && <p style={{fontSize:'0.76rem', color:'var(--accent-cyan)', marginBottom:'5px'}}><MapPin size={12} style={{display:'inline', marginRight:4}} />{audio.city}, {audio.state}</p>}
          <p style={{ 
            fontSize: '0.85rem', 
            color: 'var(--text-secondary)',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden'
          }}>
            {audio.description || 'Geospatial proximity sound experience.'}
          </p>
        </div>
      </div>

      {/* Error State Banner */}
      {(audio.error || hasPlaybackError) && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '8px 12px',
            background: 'rgba(244, 63, 94, 0.12)',
            border: '1px solid rgba(244, 63, 94, 0.3)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '12px',
            fontSize: '0.8rem',
            color: 'var(--status-rose)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={14} />
            <span>{audio.error || audioErrorMessage || 'Playback stream failed'}</span>
          </div>
          {onRetry && (
            <button 
              type="button" 
              className="btn btn-icon" 
              onClick={() => onRetry(audio.id)}
              title="Retry loading audio"
              style={{ color: 'var(--status-rose)', padding: '2px' }}
            >
              <RotateCw size={14} />
            </button>
          )}
        </div>
      )}

      {/* Progress & Scrub Bar (Active when this track is playing/paused) */}
      {isCurrentAudio && (
        <div style={{ marginBottom: '12px' }}>
          <div 
            onClick={handleSeek}
            style={{
              height: '6px',
              background: 'var(--bg-surface-hover)',
              borderRadius: 'var(--radius-full)',
              cursor: 'pointer',
              position: 'relative',
              overflow: 'hidden'
            }}
            title="Click to seek"
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
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || audio.duration)}</span>
          </div>
        </div>
      )}

      {audio.isPlace && <div style={{marginBottom:14, padding:'12px', borderRadius:'var(--radius-md)', background:'rgba(6,182,212,0.06)', border:'1px solid var(--border-subtle)'}}><p style={{fontSize:'0.82rem', lineHeight:1.5, marginBottom:10}}><strong>History & culture:</strong> {audio.history}</p><div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}><select aria-label='Narration language' value={narrationLanguage} onChange={e=>{setNarrationLanguage(e.target.value); if(isNarrating) stopNarration();}} className='input-field' style={{width:'auto',minWidth:120,padding:'7px'}}><option value='hi-IN'>हिंदी narration</option><option value='en-IN'>English narration</option></select><button type='button' className='btn btn-primary' onClick={isNarrating?stopNarration:speakPlace} style={{padding:'8px 12px'}}><Volume2 size={15}/><span>{isNarrating?'Stop narration':'Listen to place guide'}</span></button></div><p style={{fontSize:'0.7rem',color:'var(--text-muted)',marginTop:8}}>Uses your device/browser speech voice. Internet may be needed for some voices.</p></div>}

      {/* Card Actions: Explicit Play Button & Sound Bars */}
      {!audio.isPlace && <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}> 
        <button
          type="button"
          className={`btn ${isThisPlaying ? 'btn-outline-cyan' : 'btn-primary'}`}
          onClick={handlePlayToggle}
          disabled={Boolean(audio.error) || isThisLoading}
          style={{ minWidth: '130px' }}
          aria-label={isThisPlaying ? 'Pause Audio' : 'Play Audio'}
        >
          {isThisLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              <span>Loading...</span>
            </>
          ) : isThisPlaying ? (
            <>
              <Pause size={16} />
              <span>Pause</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>Play Audio</span>
            </>
          )}
        </button>

        {/* Animated equalizer waves when playing */}
        {isThisPlaying && (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '18px' }}>
            <span style={{ width: '3px', height: '60%', background: 'var(--accent-cyan)', borderRadius: '1px', animation: 'pulse-ring 1s infinite alternate' }} />
            <span style={{ width: '3px', height: '100%', background: 'var(--accent-cyan)', borderRadius: '1px', animation: 'pulse-ring 0.8s infinite alternate 0.2s' }} />
            <span style={{ width: '3px', height: '40%', background: 'var(--accent-cyan)', borderRadius: '1px', animation: 'pulse-ring 1.2s infinite alternate 0.4s' }} />
            <span style={{ width: '3px', height: '80%', background: 'var(--accent-cyan)', borderRadius: '1px', animation: 'pulse-ring 0.9s infinite alternate 0.1s' }} />
          </div>
        )}
      </div>}
    </div>
  );
}
