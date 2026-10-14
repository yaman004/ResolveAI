import { User } from '../models/User.js';
import { COOKIE_NAME, verifyToken } from '../utils/token.js';
import { unauthorized } from '../utils/AppError.js';
import { asyncHandler } from '../utils/asyncHandler.js';

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.headers.authorization;
  const token = req.cookies?.[COOKIE_NAME] || (header?.startsWith('Bearer ') ? header.slice(7) : null);
  if (!token) throw unauthorized();
  let payload;
  try {
    payload = verifyToken(token);
  } catch {
    throw unauthorized('Your session has expired. Please sign in again.', 'SESSION_EXPIRED');
  }
  const user = await User.findById(payload.sub);
  if (!user) throw unauthorized('Account not found', 'SESSION_EXPIRED');
  req.user = user;
  next();
});
