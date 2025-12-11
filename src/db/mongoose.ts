import mongoose from 'mongoose';
import Logger from '../utils/logger';

mongoose.connection.on('connected', () => {
    Logger.info('Mongoose connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    Logger.error('Mongoose connection error:', err);
});

mongoose.connection.on('disconnected', () => {
    Logger.warn('Mongoose disconnected from MongoDB');
});

export const connectDB = async (): Promise<void> => {
    const MONGODB_URI =
        process.env.MONGODB_URI ||
        'mongodb://localhost:27017/emailautomation';

    try {
        await mongoose.connect(MONGODB_URI);
        Logger.info('MongoDB connected successfully');
        Logger.info(`Database: ${mongoose.connection.name}`);
    } catch (error) {
        Logger.error('MongoDB connection error:', error);
        if (process.env.NODE_ENV === 'production') {
            process.exit(1);
        } else {
            Logger.warn(
                'Server will continue without database connection in development'
            );
        }
    }
};

export const disconnectDB = async (): Promise<void> => {
    try {
        await mongoose.connection.close();
        Logger.info('MongoDB connection closed');
    } catch (error) {
        Logger.error('Error closing MongoDB connection:', error);
        throw error;
    }
};

export default mongoose;
