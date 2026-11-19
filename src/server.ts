import app from './app';

const PORT = Number(process.env.PORT) || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});

const shutdown = (signal: string): void => {
  console.log(`${signal} received, shutting down gracefully`);
  server.close(() => process.exit(0));
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
