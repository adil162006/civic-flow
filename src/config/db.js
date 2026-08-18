import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/civicai');
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`[MongoDB] Error: ${error.message}`);
    // Do not crash app in dev if mongodb is offline, log error clearly
    console.warn('[MongoDB] Running in offline/disconnected mode or awaiting connection...');
  }
};
