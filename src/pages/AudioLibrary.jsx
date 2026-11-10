
import React, { useState, useEffect } from 'react';
import {
  Library,
  Upload,
  Search,
  Music,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

import { getAudioSources } from '../services/audioService';
import { MOCK_CATEGORIES } from '../data/mockAudioData';
import AudioCard from '../components/discovery/AudioCard';
import { useAuth } from '../context/AuthContext';

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';

export default function AudioLibrary() {
  const { user, token } = useAuth();

  const [sources, setSources] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadError, setUploadError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    state: '',
    category: 'Culture'
  });

  const [audioFile, setAudioFile] = useState(null);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    getAudioSources({ category, search })
      .then(data => {
        if (isMounted) setSources(data);
      })
      .catch(err => {
        console.error('Library fetch error:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [category, search]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();

    setUploadMessage('');
    setUploadError('');

    if (!user) {
      setUploadError('Please login before uploading audio.');
      return;
    }

    const authToken =
      token || localStorage.getItem('proxispeak_token');

    if (!authToken) {
      setUploadError('Authentication token not found. Please login again.');
      return;
    }

    if (!audioFile) {
      setUploadError('Please select an audio file.');
      return;
    }

    if (!form.title.trim() || !form.city.trim() || !form.state.trim()) {
      setUploadError('Please fill in title, city and state.');
      return;
    }

    const formData = new FormData();

    formData.append('title', form.title.trim());
    formData.append('description', form.description.trim());
    formData.append('city', form.city.trim());
    formData.append('state', form.state.trim());
    formData.append('category', form.category);
    formData.append('audio', audioFile);

    setUploading(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/audio/community/upload`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`
          },
          body: formData
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data.error || data.message || 'Audio upload failed.'
        );
      }

      setUploadMessage(
        data.message ||
        'Audio uploaded successfully! It is waiting for admin approval.'
      );

      setForm({
        title: '',
        description: '',
        city: '',
        state: '',
        category: 'Culture'
      });

      setAudioFile(null);

      const fileInput = document.getElementById('community-audio-file');

      if (fileInput) {
        fileInput.value = '';
      }

    } catch (error) {
      console.error('Community upload error:', error);
      setUploadError(error.message || 'Something went wrong during upload.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="library-page">

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Library size={28} color="var(--accent-blue)" />
            <span>Indian Place Guide</span>
          </h1>

          <p>
            Search supported Indian monuments, museums, temples and heritage
            places by name or city. Listen to bilingual place narration.
          </p>
        </div>
      </div>

      {/* Community Audio Upload */}
      <div
        className="card-panel"
        style={{ padding: '22px', marginBottom: '28px' }}
      >
        <div style={{ marginBottom: '18px' }}>
          <h2
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '1.2rem'
            }}
          >
            <Upload size={22} color="var(--accent-blue)" />
            Share Your Community Audio
          </h2>

          <p style={{ marginTop: '6px' }}>
            Upload local sounds, stories and recordings to share your
            community with others.
          </p>
        </div>

        {!user ? (
          <div style={{ padding: '14px', borderRadius: '8px' }}>
            Please login to upload community audio.
          </div>
        ) : (
          <form onSubmit={handleUpload}>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '14px'
              }}
            >
              <div>
                <label>Audio Title *</label>
                <input
                  className="input-field"
                  type="text"
                  name="title"
                  placeholder="Enter audio title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  maxLength={100}
                />
              </div>

              <div>
                <label>Category</label>
                <select
                  className="input-field"
                  name="category"
                  value={form.category}
                  onChange={handleChange}
                >
                  <option value="Culture">Culture</option>
                  <option value="Nature">Nature</option>
                  <option value="History">History</option>
                  <option value="Music">Music</option>
                  <option value="People">People</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label>City *</label>
                <input
                  className="input-field"
                  type="text"
                  name="city"
                  placeholder="e.g. Indore"
                  value={form.city}
                  onChange={handleChange}
                  required
                />
              </div>

              <div>
                <label>State *</label>
                <input
                  className="input-field"
                  type="text"
                  name="state"
                  placeholder="e.g. Madhya Pradesh"
                  value={form.state}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: '14px' }}>
              <label>Description</label>
              <textarea
                className="input-field"
                name="description"
                placeholder="Tell us about this audio..."
                value={form.description}
                onChange={handleChange}
                rows={3}
                style={{ resize: 'vertical', width: '100%' }}
              />
            </div>

            <div style={{ marginTop: '14px' }}>
              <label
                htmlFor="community-audio-file"
                style={{
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                Select Audio File *
              </label>

              <input
                id="community-audio-file"
                type="file"
                accept="audio/*"
                required
                onChange={e => setAudioFile(e.target.files?.[0] || null)}
              />

              {audioFile && (
                <p style={{ fontSize: '0.85rem', marginTop: '8px' }}>
                  Selected: {audioFile.name}
                </p>
              )}
            </div>

            {uploadMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#16a34a',
                  marginTop: '16px'
                }}
              >
                <CheckCircle size={18} />
                <span>{uploadMessage}</span>
              </div>
            )}

            {uploadError && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#ef4444',
                  marginTop: '16px'
                }}
              >
                <AlertCircle size={18} />
                <span>{uploadError}</span>
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading}
              style={{
                marginTop: '18px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                opacity: uploading ? 0.7 : 1
              }}
            >
              <Upload size={17} />
              {uploading ? 'Uploading...' : 'Upload Community Audio'}
            </button>

            <p style={{ fontSize: '0.8rem', marginTop: '10px' }}>
              Your audio will remain pending until an admin approves it.
            </p>
          </form>
        )}
      </div>

      {/* Search and Filters */}
      <div
        className="card-panel"
        style={{ padding: '16px 20px', marginBottom: '24px' }}
      >
        <div
          style={{
            display: 'flex',
            gap: '12px',
            flexWrap: 'wrap',
            marginBottom: '14px'
          }}
        >
          <div style={{ flex: '1', minWidth: '240px' }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search Indian places (e.g. Taj Mahal, Indore, Jaipur)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Category Filters */}
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

      {/* Audio Cards */}
      {isLoading ? (
        <div
          className="card-panel"
          style={{ textAlign: 'center', padding: '40px' }}
        >
          <p>Loading audio library repository...</p>
        </div>
      ) : sources.length === 0 ? (
        <div
          className="card-panel"
          style={{ textAlign: 'center', padding: '40px' }}
        >
          <p>No audio tracks found matching "{search}".</p>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '16px'
          }}
        >
          {sources.map(track => (
            <AudioCard key={track.id} audio={track} />
          ))}
        </div>
      )}

    </div>
  );
}
