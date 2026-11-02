import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const AudioContext = createContext(null);

export const PlaybackStatus = {
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error'
};

export function AudioProvider({ children }) {
  // Playback state
  const [currentTrack, setCurrentTrack] = useState(null);
  const [playbackStatus, setPlaybackStatus] = useState(PlaybackStatus.IDLE);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.85);
  const [isMuted, setIsMuted] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Playlist queue
  const [playlist, setPlaylist] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);

  // Expanded player modal visibility
  const [isExpanded, setIsExpanded] = useState(false);

  // Singleton HTMLAudioElement instance
  const audioRef = useRef(null);
  const previousVolumeRef = useRef(0.85);

  // Initialize audio element once on mount
  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'metadata';
    audio.volume = volume;
    audioRef.current = audio;

    // Attach native event listeners
    const handleLoadStart = () => {
      setPlaybackStatus(PlaybackStatus.LOADING);
      setErrorMessage(null);
    };

    const handleLoadedMetadata = () => {
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime || 0);
      if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    };

    const handlePlay = () => {
      setPlaybackStatus(PlaybackStatus.PLAYING);
      setErrorMessage(null);
    };

    const handlePause = () => {
      // Avoid overriding ERROR state if pause fired due to failure
      if (audio.error) return;
      if (audio.currentTime < audio.duration) {
        setPlaybackStatus(PlaybackStatus.PAUSED);
      }
    };

    const handleEnded = () => {
      setPlaybackStatus(PlaybackStatus.ENDED);
      setCurrentTime(audio.duration || 0);
      // Automatically advance to next track in playlist if present
      handlePlayNextInternal();
    };

    const handleError = () => {
      setPlaybackStatus(PlaybackStatus.ERROR);
      let desc = 'Failed to load audio stream. The source may be offline or invalid.';
      if (audio.error) {
        switch (audio.error.code) {
          case MediaError.MEDIA_ERR_ABORTED:
            desc = 'Audio playback was aborted by the client.';
            break;
          case MediaError.MEDIA_ERR_NETWORK:
            desc = 'A network error caused audio download to fail.';
            break;
          case MediaError.MEDIA_ERR_DECODE:
            desc = 'The audio format is corrupted or unsupported.';
            break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
            desc = 'Audio source URL not reachable or unsupported format.';
            break;
        }
      }
      setErrorMessage(desc);
    };

    const handleVolumeChange = () => {
      setVolume(audio.volume);
      setIsMuted(audio.muted);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);
    audio.addEventListener('volumechange', handleVolumeChange);

    return () => {
      // Clean up event listeners and stop playback on unmount
      audio.removeEventListener('loadstart', handleLoadStart);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audio.removeEventListener('volumechange', handleVolumeChange);
      audio.pause();
      audio.src = '';
    };
  }, []);

  /**
   * Internal helper to trigger next track
   */
  const handlePlayNextInternal = useCallback(() => {
    setPlaylist((prevPlaylist) => {
      setCurrentIndex((prevIndex) => {
        if (prevPlaylist.length > 0 && prevIndex < prevPlaylist.length - 1) {
          const nextIndex = prevIndex + 1;
          const nextTrack = prevPlaylist[nextIndex];
          setTimeout(() => playTrack(nextTrack, prevPlaylist), 0);
          return nextIndex;
        }
        return prevIndex;
      });
      return prevPlaylist;
    });
  }, []);

  /**
   * Loads and initiates playback for a target track.
   *
   * @param {object} track - Track object with audioUrl, title, etc.
   * @param {Array} newPlaylist - Optional playlist context
   */
  const playTrack = useCallback((track, newPlaylist = null) => {
    if (!track) return;

    const audio = audioRef.current;
    if (!audio) return;

    // Reset error state
    setErrorMessage(null);
    setCurrentTrack(track);

    if (newPlaylist && Array.isArray(newPlaylist)) {
      setPlaylist(newPlaylist);
      const foundIdx = newPlaylist.findIndex(t => t.id === track.id);
      setCurrentIndex(foundIdx !== -1 ? foundIdx : 0);
    }

    if (!track.audioUrl) {
      setPlaybackStatus(PlaybackStatus.ERROR);
      setErrorMessage('Audio URL is missing for this source.');
      return;
    }

    // Set duration from metadata if already known
    if (track.duration) {
      setDuration(track.duration);
    }

    // Change source and load
    try {
      audio.src = track.audioUrl;
      audio.load();
      const playPromise = audio.play();

      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          // Autoplay policy or abort handling
          if (err.name === 'NotAllowedError') {
            setPlaybackStatus(PlaybackStatus.PAUSED);
            setErrorMessage('Autoplay blocked by browser. Click Play to start listening.');
          } else if (err.name !== 'AbortError') {
            setPlaybackStatus(PlaybackStatus.ERROR);
            setErrorMessage(`Playback error: ${err.message}`);
          }
        });
      }
    } catch (err) {
      setPlaybackStatus(PlaybackStatus.ERROR);
      setErrorMessage(`Failed to initiate stream: ${err.message}`);
    }
  }, []);

  const pauseTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      setPlaybackStatus(PlaybackStatus.PAUSED);
    }
  }, []);

  const resumeTrack = useCallback(() => {
    const audio = audioRef.current;
    if (audio && currentTrack) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          setPlaybackStatus(PlaybackStatus.ERROR);
          setErrorMessage(`Could not resume playback: ${err.message}`);
        });
      }
    }
  }, [currentTrack]);

  const togglePlayPause = useCallback(() => {
    if (playbackStatus === PlaybackStatus.PLAYING) {
      pauseTrack();
    } else if (playbackStatus === PlaybackStatus.PAUSED || playbackStatus === PlaybackStatus.ENDED) {
      resumeTrack();
    } else if (currentTrack) {
      playTrack(currentTrack);
    }
  }, [playbackStatus, currentTrack, pauseTrack, resumeTrack, playTrack]);

  const seekTo = useCallback((seconds) => {
    const audio = audioRef.current;
    if (audio && !isNaN(seconds)) {
      const target = Math.max(0, Math.min(seconds, audio.duration || duration || seconds));
      audio.currentTime = target;
      setCurrentTime(target);
    }
  }, [duration]);

  const setAudioVolume = useCallback((level) => {
    const audio = audioRef.current;
    const clamped = Math.max(0, Math.min(1, level));
    if (audio) {
      audio.volume = clamped;
      if (clamped > 0 && audio.muted) {
        audio.muted = false;
      }
    }
    setVolume(clamped);
  }, []);

  const toggleMute = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isMuted || volume === 0) {
      const restore = previousVolumeRef.current > 0 ? previousVolumeRef.current : 0.85;
      audio.muted = false;
      audio.volume = restore;
      setVolume(restore);
      setIsMuted(false);
    } else {
      previousVolumeRef.current = volume;
      audio.muted = true;
      audio.volume = 0;
      setVolume(0);
      setIsMuted(true);
    }
  }, [isMuted, volume]);

  const playNext = useCallback(() => {
    if (playlist.length === 0) return;
    const nextIdx = (currentIndex + 1) % playlist.length;
    setCurrentIndex(nextIdx);
    playTrack(playlist[nextIdx], playlist);
  }, [playlist, currentIndex, playTrack]);

  const playPrevious = useCallback(() => {
    if (playlist.length === 0) return;
    // If more than 3 seconds in, restart track
    if (currentTime > 3) {
      seekTo(0);
      return;
    }
    const prevIdx = (currentIndex - 1 + playlist.length) % playlist.length;
    setCurrentIndex(prevIdx);
    playTrack(playlist[prevIdx], playlist);
  }, [playlist, currentIndex, currentTime, seekTo, playTrack]);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const value = {
    currentTrack,
    playbackStatus,
    isPlaying: playbackStatus === PlaybackStatus.PLAYING,
    isLoading: playbackStatus === PlaybackStatus.LOADING,
    isPaused: playbackStatus === PlaybackStatus.PAUSED,
    isError: playbackStatus === PlaybackStatus.ERROR,
    currentTime,
    duration,
    volume,
    isMuted,
    errorMessage,
    playlist,
    currentIndex,
    isExpanded,
    setIsExpanded,
    playTrack,
    pauseTrack,
    resumeTrack,
    togglePlayPause,
    seekTo,
    setAudioVolume,
    toggleMute,
    playNext,
    playPrevious,
    clearError
  };

  return (
    <AudioContext.Provider value={value}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

export default AudioContext;
