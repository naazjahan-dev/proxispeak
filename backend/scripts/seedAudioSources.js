
import mongoose from 'mongoose';
import AudioSource from '../models/AudioSource.js';
import { connectDB, closeDB } from '../config/db.js';

// Import the existing frontend mock dataset
import { MOCK_AUDIO_SOURCES } from '../../../ProxiSpeak2/ProxiSpeak2/src/data/mockAudioData.js';

async function seedAudioSources() {
  try {
    await connectDB();

    const operations = MOCK_AUDIO_SOURCES.map((source) => ({
      updateOne: {
        filter: { id: source.id },
        update: { $set: source },
        upsert: true
      }
    }));

    const result = await AudioSource.bulkWrite(operations);

    console.log('Audio places seeded successfully!');
    console.log('Total places:', MOCK_AUDIO_SOURCES.length);
    console.log('Inserted:', result.upsertedCount);
    console.log('Updated:', result.modifiedCount);
  } catch (error) {
    console.error('Seeding failed:', error.message);
    process.exitCode = 1;
  } finally {
    await closeDB();
  }
}

seedAudioSources();
