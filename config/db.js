import mongoose from 'mongoose';

/**
 * Connect to MongoDB database
 */
export const connectDB = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/chefflow';

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    // In production we would exit, but in development or testing we allow server to start
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('disconnected', () => {
    console.warn('[Database] MongoDB disconnected');
  });

  mongoose.connection.on('error', (err) => {
    console.error(`[Database Error] Runtime connection error: ${err.message}`);
  });
};

/**
 * Disconnect from MongoDB (useful for graceful shutdown or tests)
 */
export const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    console.log('[Database] MongoDB connection closed');
  } catch (error) {
    console.error(`[Database Error] Error during disconnection: ${error.message}`);
  }
};
