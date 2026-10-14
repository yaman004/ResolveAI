import rateLimit from 'express-rate-limit';
import { config } from '../config/env.js';

const make = (opts) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => config.isTest,
    handler: (_req, res) =>
      res.status(429).json({ error: { message: opts.message, code: 'RATE_LIMITED' } }),
    ...opts,
  });

export const globalLimiter = make({ windowMs: 60_000, limit: 300, message: 'Too many requests. Please slow down.' });
export const authLimiter = make({ windowMs: 15 * 60_000, limit: 25, message: 'Too many attempts. Try again in a few minutes.' });
export const aiLimiter = make({ windowMs: 60_000, limit: 15, message: 'Too many AI requests. Wait a moment and try again.' });
