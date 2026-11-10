
import mongoose from 'mongoose';

const audioSourceSchema = new mongoose.Schema({

  // Unique audio ID
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },

  // Basic audio information
  title: {
    type: String,
    required: true,
    trim: true
  },

  city: {
    type: String,
    required: true,
    trim: true
  },

  state: {
    type: String,
    required: true,
    trim: true
  },

  author: {
    type: String,
    default: 'Anonymous',
    trim: true
  },

  category: {
    type: String,
    required: true,
    trim: true
  },

  description: {
    type: String,
    default: ''
  },

  descriptionHi: {
    type: String,
    default: ''
  },

  history: {
    type: String,
    default: ''
  },

  // GPS coordinates
  coordinates: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },

  // Audio file information
  audioUrl: {
    type: String,
    default: ''
  },

  duration: {
    type: Number,
    default: 90,
    min: 0
  },

  // Audio tags
  tags: {
    type: [String],
    default: []
  },

  signalStrength: {
    type: String,
    default: 'Unknown'
  },

  radiusKm: {
    type: Number,
    default: 2,
    min: 0
  },

  coverColor: {
    type: String,
    default: '#06b6d4'
  },

  language: {
    type: String,
    default: 'hi-IN'
  },

  // Heritage place identification
  isPlace: {
    type: Boolean,
    default: true
  },

  // Audio type: Community or Heritage
  audioType: {
    type: String,
    enum: ['community', 'heritage'],
    default: function () {
      return this.isPlace ? 'heritage' : 'community';
    }
  },

  // User who uploaded the audio
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // Audio approval status
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: function () {
      return this.isPlace ? 'approved' : 'pending';
    }
  }

}, {
  timestamps: true
});

// Indexes for efficient filtering
audioSourceSchema.index({
  audioType: 1,
  approvalStatus: 1
});

audioSourceSchema.index({
  uploadedBy: 1
});

audioSourceSchema.index({
  isPlace: 1
});

// Create AudioSource model
const AudioSource = mongoose.models.AudioSource ||
  mongoose.model('AudioSource', audioSourceSchema);

export default AudioSource;
