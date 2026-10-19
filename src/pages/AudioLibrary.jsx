import React from 'react';
import { Library, Search, Filter } from 'lucide-react';

export default function AudioLibrary() {
  return (
    <div className="library-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Library size={28} color="var(--accent-blue)" />
            <span>Audio Library</span>
          </h1>
          <p>Browse global audio tracks, localized narratives, and soundscape recordings.</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="card-panel" style={{ padding: '16px 20px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '240px', position: 'relative' }}>
            <input 
              type="text" 
              className="input-field" 
              placeholder="Search by title, tag, or creator..."
            />
          </div>
          <button className="btn btn-secondary">
            <Filter size={16} />
            <span>All Categories</span>
          </button>
        </div>
      </div>

      <div className="card-panel" style={{ textAlign: 'center', padding: '40px' }}>
        <p>Loading audio library repository...</p>
      </div>
    </div>
  );
}
