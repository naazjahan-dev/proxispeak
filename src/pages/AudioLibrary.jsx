import React, { useState, useEffect } from 'react';
import { Library, Search, Filter, Layers } from 'lucide-react';
import { getAudioSources } from '../services/audioService';
import { MOCK_CATEGORIES } from '../data/mockAudioData';
import AudioCard from '../components/discovery/AudioCard';

export default function AudioLibrary() {
  const [sources, setSources] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getAudioSources({ category, search })
      .then(data => {
        if (isMounted) setSources(data);
      })
      .catch(err => console.error('Library fetch error:', err))
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category, search]);

  return (
    <div className="library-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Library size={28} color="var(--accent-blue)" />
            <span>Indian Place Guide</span>
          </h1>
          <p>Search supported Indian monuments, museums, temples and heritage places by name or city. Listen to bilingual place narration.</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '14px' }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search Indian places (e.g. Taj Mahal, Indore, Jaipur)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {MOCK_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              className={`btn ${category === cat ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              onClick={() => setCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Audio Cards */}
      {isLoading ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading audio library repository...</p>
        </div>
      ) : sources.length === 0 ? (
        <div className="card-panel" style={{ textAlign: 'center', padding: '40px' }}>
          <p>No audio tracks found matching "{search}".</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {sources.map(track => (
            <AudioCard key={track.id} audio={track} />
          ))}
        </div>
      )}
    </div>
  );
}
