import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import Logger from './utils/logger';

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

app.get('/health', (req: Request, res: Response) => {
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
    (err: Error, req: Request, res: Response, next: express.NextFunction) => {
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
