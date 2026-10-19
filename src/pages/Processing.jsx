import React from 'react';
import { Database, UploadCloud } from 'lucide-react';

export default function Processing() {
  return (
    <div className="processing-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Database size={28} color="var(--accent-purple)" />
            <span>CSV Processing Pipeline</span>
          </h1>
          <p>Stream-based ingestion dashboard for bulk geospatial audio coordinate datasets.</p>
        </div>
      </div>

      <div className="card-panel" style={{ textAlign: 'center', padding: '60px 24px', borderStyle: 'dashed' }}>
        <UploadCloud size={48} color="var(--accent-purple)" style={{ marginBottom: '16px' }} />
        <h3>Drop Geospatial CSV Dataset Here</h3>
        <p style={{ maxWidth: '420px', margin: '8px auto 20px auto' }}>
          Supports batch streaming of thousands of records with latitude, longitude, and audio streaming metadata.
        </p>
        <button className="btn btn-primary" style={{ background: 'var(--accent-purple)' }}>
          Select CSV File
        </button>
      </div>
    </div>
  );
}
