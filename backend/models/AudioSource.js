
import mongoose from 'mongoose';

const audioSourceSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true
  },
  state: {
    type: String,
    required: true
  },
  author: {
    type: String,
    default: 'Anonymous'
  },
  category: {
    type: String,
    required: true
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
  audioUrl: {
    type: String,
    default: ''
  },
  duration: {
    type: Number,
    default: 90
  },
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
    default: 2
  },
  coverColor: {
    type: String,
    default: '#06b6d4'
  },
  language: {
    type: String,
    default: 'hi-IN'
  },
  isPlace: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const AudioSource = mongoose.models.AudioSource ||
  mongoose.model('AudioSource', audioSourceSchema);

export default AudioSource;
