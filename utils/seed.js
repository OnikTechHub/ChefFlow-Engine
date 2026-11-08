import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { Recipe } from '../models/Recipe.js';
import { sampleRecipes } from './seedData.js';

dotenv.config();

const seedDatabase = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chefflow';

  try {
    await mongoose.connect(uri);
    console.log('[Seed] Connected to MongoDB...');

    // Clear existing recipes if any
    await Recipe.deleteMany({});
    console.log('[Seed] Cleaned existing recipes collection');

    // Insert recipes
    for (const recipe of sampleRecipes) {
      await Recipe.create(recipe);
    }

    console.log(`[Seed] Successfully seeded ${sampleRecipes.length} culinary recipes!`);
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error(`[Seed Error] Failed to seed database: ${error.message}`);
    process.exit(1);
  }
};

seedDatabase();

