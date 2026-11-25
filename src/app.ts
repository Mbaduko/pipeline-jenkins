import express, { Application, NextFunction, Request, Response } from 'express';
import healthRouter from './routes/health';
import { collectDefaultMetrics,register } from 'prom-client';

const app: Application = express();

collectDefaultMetrics()

app.disable('x-powered-by');
app.use(express.json());

app.use('/health', healthRouter);

app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'Hello from pipeline-jenkins' });
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    res.status(500).end(err);
  }
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
