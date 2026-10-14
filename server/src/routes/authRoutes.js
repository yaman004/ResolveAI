import { Router } from 'express';
import * as c from '../controllers/authController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { loginBody, profileBody, registerBody } from '../validators/schemas.js';

const r = Router();
r.post('/register', authLimiter, validate({ body: registerBody }), c.register);
r.post('/login', authLimiter, validate({ body: loginBody }), c.login);
r.post('/logout', c.logout);
r.get('/me', requireAuth, c.me);
r.patch('/profile', requireAuth, validate({ body: profileBody }), c.updateProfile);
export default r;
