/**
 * ProxiSpeak Mock Audio Dataset
 * Realistic geospatial audio sources for offline development and testing.
 * Includes diverse categories, verified public domain audio streams,
 * variable coordinates, and intentional edge cases (missing coords, invalid audio URL).
 */

export const MOCK_AUDIO_SOURCES = [
  {
    id: 'audio-001',
    title: 'Rainforest Canopy Ambient Echoes',
    author: 'Acoustic Ecology Lab',
    category: 'Nature & Soundscapes',
    description: 'Binaural field recording of early dawn avian chorus and subtle canopy rain in the temperate forest.',
    coordinates: {
      latitude: 12.9716,
      longitude: 77.5946
    },
    audioUrl: 'https://cdn.freesound.org/previews/316/316844_4939433-lq.mp3',
    duration: 184,
    tags: ['ambient', 'nature', 'binaural', 'rainforest', 'relaxation'],
    signalStrength: 'Strong',
    radiusKm: 2.5,
    coverColor: '#06b6d4',
    createdAt: '2026-09-15T08:30:00Z'
  },
  {
    id: 'audio-002',
    title: 'Historic Clocktower Bells & Promenade',
    author: 'Urban Sound Archives',
    category: 'Historical Narratives',
    description: 'Chiming bells recorded from the municipal plaza quadrangle with ambient reverberation and footfall acoustics.',
    coordinates: {
      latitude: 12.9750,
      longitude: 77.5990
    },
    audioUrl: 'https://cdn.freesound.org/previews/264/264498_4284968-lq.mp3',
    duration: 142,
    tags: ['heritage', 'bells', 'urban', 'architecture', 'history'],
    signalStrength: 'Strong',
    radiusKm: 1.0,
    coverColor: '#3b82f6',
    createdAt: '2026-09-18T14:15:00Z'
  },
  {
    id: 'audio-003',
    title: 'Cybernetic Metro Sub-Bass Pulse',
    author: 'Transit Acoustics Project',
    category: 'Urban Architecture',
    description: 'Subterranean transit vibrations and magnetic train resonance synthesized into a rhythmic ambient pulse.',
    coordinates: {
      latitude: 12.9680,
      longitude: 77.5890
    },
    audioUrl: 'https://cdn.freesound.org/previews/564/564943_11861866-lq.mp3',
    duration: 210,
    tags: ['subway', 'metro', 'ambient', 'low-end', 'urban'],
    signalStrength: 'Medium',
    radiusKm: 3.0,
    coverColor: '#8b5cf6',
    createdAt: '2026-09-22T19:45:00Z'
  },
  {
    id: 'audio-004',
    title: 'Botanical Garden Stream & Waterwheel',
    author: 'Heritage Preservation Trust',
    category: 'Nature & Soundscapes',
    description: 'Hydro-acoustic flow past mossy cobblestones and wooden paddlewheels in the central botanical sanctuary.',
    coordinates: {
      latitude: 12.9812,
      longitude: 77.6050
    },
    audioUrl: 'https://cdn.freesound.org/previews/415/415911_5121236-lq.mp3',
    duration: 165,
    tags: ['water', 'stream', 'garden', 'peaceful'],
    signalStrength: 'Weak',
    radiusKm: 1.5,
    coverColor: '#10b981',
    createdAt: '2026-09-25T11:00:00Z'
  },
  {
    id: 'audio-005',
    title: 'Community Open Mic: Acoustic Strings',
    author: 'Downtown Artists Collective',
    category: 'Music & Performance',
    description: 'Live unamplified nylon string guitar and spoken verse from the neighborhood pavilion gathering.',
    coordinates: {
      latitude: 12.9650,
      longitude: 77.6100
    },
    audioUrl: 'https://cdn.freesound.org/previews/337/337049_3232293-lq.mp3',
    duration: 198,
    tags: ['live', 'acoustic', 'guitar', 'spoken-word'],
    signalStrength: 'Strong',
    radiusKm: 0.8,
    coverColor: '#f59e0b',
    createdAt: '2026-09-28T17:20:00Z'
  },
  {
    id: 'audio-006',
    title: 'University Observatory Stellar Winds',
    author: 'Astrophysics Outreach',
    category: 'Guide Notes',
    description: 'Data sonification of ionospheric radio plasma waves converted into audible acoustic frequency ranges.',
    coordinates: {
      latitude: 12.9890,
      longitude: 77.5850
    },
    audioUrl: 'https://cdn.freesound.org/previews/384/384468_5121236-lq.mp3',
    duration: 245,
    tags: ['science', 'sonification', 'space', 'radio'],
    signalStrength: 'Medium',
    radiusKm: 5.0,
    coverColor: '#ec4899',
    createdAt: '2026-10-01T21:10:00Z'
  },
  {
    id: 'audio-007',
    title: 'Harbor Foghorn & Coastal Wind',
    author: 'Maritime Audio Foundation',
    category: 'Nature & Soundscapes',
    description: 'Deep resonant foghorn blast cutting through coastal fog layers at the outer perimeter breakwater.',
    coordinates: {
      latitude: 12.9550,
      longitude: 77.5750
    },
    audioUrl: 'https://cdn.freesound.org/previews/467/467882_9961300-lq.mp3',
    duration: 120,
    tags: ['maritime', 'foghorn', 'wind', 'ocean'],
    signalStrength: 'Weak',
    radiusKm: 10.0,
    coverColor: '#0ea5e9',
    createdAt: '2026-10-04T05:40:00Z'
  },
  {
    id: 'audio-008',
    title: 'Old Town Artisan Workshop Resonance',
    author: 'Craft Guild Registry',
    category: 'Historical Narratives',
    description: 'Sound of blacksmithing anvil strikes, leather tooling, and rhythmic hand-loom weaving.',
    // Intentionally missing coordinates for testing coordinate validation
    coordinates: null,
    audioUrl: 'https://cdn.freesound.org/previews/209/209578_2402876-lq.mp3',
    duration: 155,
    tags: ['craft', 'heritage', 'tools', 'artisan'],
    signalStrength: 'Unknown',
    radiusKm: null,
    coverColor: '#d97706',
    createdAt: '2026-10-06T12:00:00Z'
  },
  {
    id: 'audio-009',
    title: 'Corrupted Signal / Test Stream Error',
    author: 'Diagnostics Unit',
    category: 'Guide Notes',
    description: 'Test node with an invalid stream destination to verify client-side playback error recovery and user alerts.',
    coordinates: {
      latitude: 12.9720,
      longitude: 77.5930
    },
    // Intentionally invalid URL to verify error handling
    audioUrl: 'https://non-existent-audio-domain.invalid/broken-stream.mp3',
    duration: 60,
    tags: ['test', 'error-handling', 'diagnostics'],
    signalStrength: 'Intermittent',
    radiusKm: 1.0,
    coverColor: '#ef4444',
    createdAt: '2026-10-08T09:00:00Z'
  }
];

export const MOCK_CATEGORIES = [
  'All',
  'Nature & Soundscapes',
  'Historical Narratives',
  'Urban Architecture',
  'Music & Performance',
  'Guide Notes'
];

/**
 * Retrieves all mock audio sources, optionally filtered by category and search keyword.
 */
export function getMockAudioSources({ category = 'All', search = '', radiusKm = null, userCoords = null } = {}) {
  let results = [...MOCK_AUDIO_SOURCES];

  if (category && category !== 'All') {
    results = results.filter(item => item.category.toLowerCase() === category.toLowerCase());
  }

  if (search && search.trim() !== '') {
    const q = search.trim().toLowerCase();
    results = results.filter(item =>
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.author.toLowerCase().includes(q) ||
      item.tags.some(tag => tag.toLowerCase().includes(q))
    );
  }

  return results;
}

/**
 * Retrieves a single mock audio source by ID.
 */
export function getMockAudioById(id) {
  return MOCK_AUDIO_SOURCES.find(item => item.id === id) || null;
}
