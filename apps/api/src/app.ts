import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env';
import { errorHandler } from './common/middleware/error-handler';
import { notFoundHandler } from './common/middleware/not-found';
import { authRouter } from './modules/auth/auth.routes';
import { availabilityRouter } from './modules/availability/availability.routes';
import { healthRouter } from './modules/health/health.routes';
import { notificationsRouter } from './modules/notifications/notification.routes';
import { professionalsRouter } from './modules/professionals/professionals.routes';
import { sessionsRouter } from './modules/sessions/session.routes';

export function createApp() {
  const app = express();

  app.disable('x-powered-by');
  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }
  app.use(helmet());
  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(cookieParser());
  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/availability', availabilityRouter);
  app.use('/api/professionals', professionalsRouter);
  app.use('/api/sessions', sessionsRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
