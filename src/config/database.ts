import mongoose from 'mongoose';
import { logger } from '@/utils/logger';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('MONGODB_URI environment variable is not defined');
}

const connectDatabase = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: parseInt(process.env.CONNECTION_POOL_SIZE || '10'),
      serverSelectionTimeoutMS: parseInt(process.env.QUERY_TIMEOUT || '30000'),
      socketTimeoutMS: parseInt(process.env.QUERY_TIMEOUT || '30000'),
      bufferMaxEntries: 0,
      bufferCommands: false,
    };

    await mongoose.connect(MONGODB_URI, options);

    mongoose.connection.on('connected', () => {
      logger.info('MongoDB connected successfully');
    });

    mongoose.connection.on('error', (error) => {
      logger.error('MongoDB connection error:', error);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    logger.error('Database connection failed:', error);
    process.exit(1);
  }
};

export { connectDatabase };
