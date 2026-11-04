import { Router } from 'express';
import mongoose from 'mongoose';
import { asyncHandler } from '../../common/middleware/async-handler';

export const healthRouter = Router();

healthRouter.get(
  '/',
  asyncHandler(async (_req, res) => {
    const database = mongoose.connection.db;
    if (
      mongoose.connection.readyState !== mongoose.ConnectionStates.connected ||
      database === undefined
    ) {
      res.status(503).json({ status: 'unavailable', database: 'disconnected' });
      return;
    }

    try {
      await database.admin().ping();
    } catch {
      res.status(503).json({ status: 'unavailable', database: 'disconnected' });
      return;
    }
    res.status(200).json({ status: 'ok', database: 'connected' });
  }),
);
