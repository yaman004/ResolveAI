import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

export const COOKIE_NAME = 'resolveai_token';

export const signToken = (userId) => jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: `${config.jwtExpiresDays}d` });
export const verifyToken = (token) => jwt.verify(token, config.jwtSecret);

export const cookieOptions = () => ({
  httpOnly: true,
  secure: config.isProd || config.cookieSameSite === 'none',
  sameSite: config.cookieSameSite,
  path: '/',
  maxAge: config.jwtExpiresDays * 24 * 60 * 60 * 1000,
});

export const setAuthCookie = (res, userId) => res.cookie(COOKIE_NAME, signToken(userId), cookieOptions());
export const clearAuthCookie = (res) => {
  const { maxAge, ...opts } = cookieOptions();
  res.clearCookie(COOKIE_NAME, opts);
};

export const randomToken = () => crypto.randomBytes(32).toString('hex');
export const hashToken = (t) => crypto.createHash('sha256').update(t).digest('hex');
