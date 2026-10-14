import { ZodError } from 'zod';
import mongoose from 'mongoose';
import { config } from '../config/env.js';

export const notFoundHandler = (_req, res) =>
  res.status(404).json({ error: { message: 'Route not found', code: 'ROUTE_NOT_FOUND' } });

// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, _next) => {
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const key = issue.path.join('.') || '_';
      if (!fields[key]) fields[key] = issue.message;
    }
    const first = Object.values(fields)[0];
    return res.status(400).json({ error: { message: first || 'Invalid input', code: 'VALIDATION_ERROR', details: fields } });
  }
  if (err?.expose && err.status) {
    return res.status(err.status).json({ error: { message: err.message, code: err.code, details: err.details } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(404).json({ error: { message: 'Not found', code: 'NOT_FOUND' } });
  }
  if (err?.code === 11000) {
    return res.status(409).json({ error: { message: 'That record already exists.', code: 'DUPLICATE' } });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { message: 'Malformed JSON body', code: 'BAD_JSON' } });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: { message: 'Request body is too large', code: 'PAYLOAD_TOO_LARGE' } });
  }
  if (!config.isTest) console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  return res.status(500).json({ error: { message: 'Something went wrong on our side. Please try again.', code: 'INTERNAL_ERROR' } });
};
