import dotenv from 'dotenv';
import app from './app';
import Logger from './utils/logger';
import { connectDB, disconnectDB } from './db/mongoose';

dotenv.config();

const PORT = process.env.PORT || 3000;

const gracefulShutdown = async (): Promise<void> => {
    Logger.info('\nShutting down gracefully...');
    try {
        await disconnectDB();
        process.exit(0);
    } catch (error) {
        Logger.error('✗ Error during shutdown:', error);
        process.exit(1);
    }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

const startServer = async (): Promise<void> => {
    try {
        await connectDB();

        app.listen(PORT, () => {
            Logger.info(`Server is running on port ${PORT}`);
            Logger.info(
                `Environment: ${process.env.NODE_ENV || 'development'}`
            );
            Logger.info(`Health check: http://localhost:${PORT}/health`);
        });
    } catch (error) {
        Logger.error('Failed to start server:', error);
        process.exit(1);
    }
};

if (require.main === module) {
    startServer();
}

export { app, connectDB, gracefulShutdown };
