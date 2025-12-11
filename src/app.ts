import dotenv from 'dotenv';

// Load environment variables first, before any other imports
dotenv.config();

import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import session from 'express-session';
import passport from './config/passport';
import Logger from './utils/logger';
import authRoutes from './routes/auth.routes';

const app: Application = express();

app.use(helmet());

app.use(
    cors({
        origin: process.env.CORS_ORIGIN || '*',
        credentials: true,
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
// TODO: Add SESSION_SECRET to your .env file
app.use(
    session({
        secret: process.env.SESSION_SECRET || 'your-secret-key-here',
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: process.env.NODE_ENV === 'production',
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
        },
    })
);

// Initialize Passport and restore authentication state from session
app.use(passport.initialize());
app.use(passport.session());

if (process.env.NODE_ENV !== 'test') {
    const morganFormat =
        ':method :url :status :res[content-length] - :response-time ms';

    app.use(
        morgan(morganFormat, {
            stream: {
                write: (message: string) => {
                    const logMessage = message.trim();
                    Logger.http(logMessage);
                },
            },
        })
    );
}

// Routes
app.use('/auth', authRoutes);

app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
    });
});

app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        message: `Cannot ${req.method} ${req.path}`,
    });
});

app.use(
    (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
        Logger.error(`Error: ${err.message}`, { stack: err.stack });
        res.status(500).json({
            error: 'Internal Server Error',
            message:
                process.env.NODE_ENV === 'production'
                    ? 'Something went wrong'
                    : err.message,
        });
    }
);

export default app;
