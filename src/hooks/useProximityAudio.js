import { useState, useEffect, useCallback, useRef } from 'react';
import { subscribeToProximityEvents } from '../services/proximityEventAdapter';
import { getAudioById } from '../services/audioService';

/**
 * Custom hook to manage proximity-triggered audio cards.
 * Responds to ENTER and EXIT events from the geolocation engine.
 * Fetches audio metadata when incomplete, handles deduplication,
 * and maintains in-range vs out-of-range states.
 */
export function useProximityAudio() {
  const [cards, setCards] = useState([]);
  const [loadingMap, setLoadingMap] = useState({});
  const [dismissedIds, setDismissedIds] = useState(new Set());

  // Use ref to read fresh cards inside event handlers without rebuilding listeners
  const cardsRef = useRef(cards);
  cardsRef.current = cards;

  const dismissedRef = useRef(dismissedIds);
  dismissedRef.current = dismissedIds;

  /**
   * Fetches metadata for an audio ID and adds or updates the card.
   */
  const fetchAndAddCard = useCallback(async (audioId, eventPayload) => {
    setLoadingMap(prev => ({ ...prev, [audioId]: true }));

    try {
      const fetched = await getAudioById(audioId);

      if (!fetched) {
        throw new Error(`Audio node "${audioId}" not found in catalogue`);
      }

      setCards(prevCards => {
        // Double-check deduplication before appending
        const exists = prevCards.find(c => c.id === audioId);
        const mergedCard = {
          ...fetched,
          id: audioId,
          title: eventPayload.title || fetched.title || 'Nearby Sound Node',
          description: eventPayload.description || fetched.description || 'Geospatial proximity audio stream.',
          audioUrl: eventPayload.audioUrl || fetched.audioUrl,
          distance: eventPayload.distance !== undefined ? eventPayload.distance : null,
          inRange: true,
          error: null,
          enteredAt: Date.now()
        };

        if (exists) {
          return prevCards.map(c => (c.id === audioId ? { ...c, ...mergedCard } : c));
        }
        return [mergedCard, ...prevCards];
      });
    } catch (err) {
      console.error(`[useProximityAudio] Failed to load metadata for ${audioId}:`, err);

      setCards(prevCards => {
        const exists = prevCards.find(c => c.id === audioId);
        const errorCard = {
          id: audioId,
          title: eventPayload.title || `Audio Node #${audioId}`,
          description: 'Failed to retrieve audio details from server.',
          audioUrl: eventPayload.audioUrl || '',
          distance: eventPayload.distance,
          inRange: true,
          error: err.message || 'Could not load audio details',
          enteredAt: Date.now()
        };

        if (exists) {
          return prevCards.map(c => (c.id === audioId ? { ...c, ...errorCard } : c));
        }
        return [errorCard, ...prevCards];
      });
    } finally {
      setLoadingMap(prev => {
        const next = { ...prev };
        delete next[audioId];
        return next;
      });
    }
  }, []);

  /**
   * Handles incoming proximity event (ENTER or EXIT).
   */
  const handleProximityEvent = useCallback((event) => {
    const { type, audioId, title, audioUrl, description, distance } = event;

    if (type === 'ENTER') {
      // If user manually dismissed this card, allow re-entry if range changes
      if (dismissedRef.current.has(audioId)) {
        setDismissedIds(prev => {
          const next = new Set(prev);
          next.delete(audioId);
          return next;
        });
      }

      const existingCard = cardsRef.current.find(c => c.id === audioId);

      if (existingCard) {
        // Deduplication: Already displayed! Simply update distance and mark inRange
        setCards(prevCards =>
          prevCards.map(card => {
            if (card.id === audioId) {
              return {
                ...card,
                inRange: true,
                distance: distance !== undefined ? distance : card.distance,
                lastSeenAt: Date.now()
              };
            }
            return card;
          })
        );
        return;
      }

      // Check if event already contains sufficient metadata
      if (title && audioUrl) {
        const newCard = {
          id: audioId,
          title,
          description: description || 'Geospatial proximity audio stream.',
          audioUrl,
          distance: distance !== undefined ? distance : null,
          inRange: true,
          error: null,
          enteredAt: Date.now()
        };

        setCards(prevCards => [newCard, ...prevCards]);
      } else {
        // Incomplete metadata: fetch from audioService
        fetchAndAddCard(audioId, event);
      }
    } else if (type === 'EXIT') {
      // Mark out of range, do not interrupt audio already playing!
      setCards(prevCards =>
        prevCards.map(card => {
          if (card.id === audioId) {
            return {
              ...card,
              inRange: false,
              exitedAt: Date.now()
            };
          }
          return card;
        })
      );
    }
  }, [fetchAndAddCard]);

  // Subscribe to proximity event adapter
  useEffect(() => {
    const unsubscribe = subscribeToProximityEvents(handleProximityEvent);
    return () => {
      unsubscribe();
    };
  }, [handleProximityEvent]);

  // Dismiss a specific card from the screen
  const dismissCard = useCallback((audioId) => {
    setDismissedIds(prev => new Set(prev).add(audioId));
    setCards(prev => prev.filter(c => c.id !== audioId));
  }, []);

  // Clear all cards
  const clearAllCards = useCallback(() => {
    setCards([]);
    setDismissedIds(new Set());
  }, []);

  // Retry fetching metadata for an error card
  const retryFetch = useCallback((audioId) => {
    const card = cardsRef.current.find(c => c.id === audioId);
    if (card) {
      fetchAndAddCard(audioId, card);
    }
  }, [fetchAndAddCard]);

  return {
    cards,
    loadingMap,
    dismissCard,
    clearAllCards,
    retryFetch
  };
}

export default useProximityAudio;
