import express, { Application, NextFunction, Request, Response } from 'express';
import healthRouter from './routes/health';

const app: Application = express();

app.disable('x-powered-by');
app.use(express.json());

app.use('/health', healthRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from pipeline-jenkins' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

export default app;
