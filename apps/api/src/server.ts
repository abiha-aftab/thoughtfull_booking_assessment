import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { env } from './config/env';
import { databaseFailureMessage } from './config/redact';
import { createShutdown } from './config/shutdown';

const app = createApp();

try {
  await connectDb(env.MONGODB_URI);
} catch (error) {
  console.error('Database connection failed');
  console.error(databaseFailureMessage(error, env.MONGODB_URI));
  process.exit(1);
}

const server = app.listen(env.API_PORT, () => {
  console.log(`API listening on port ${env.API_PORT}`);
});

const shutdown = createShutdown({
  close: () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    }),
  disconnect: disconnectDb,
  exit: (code) => {
    process.exit(code);
  },
  log: (message) => {
    console.log(message);
  },
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    void shutdown(signal);
  });
}
