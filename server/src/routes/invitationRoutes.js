import { Router } from 'express';
import * as c from '../controllers/orgController.js';
import { requireAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimit.js';
import { tokenParam } from '../validators/schemas.js';

const r = Router();
r.get('/:token', authLimiter, validate({ params: tokenParam }), c.previewInvitation);
r.post('/:token/accept', authLimiter, requireAuth, validate({ params: tokenParam }), c.acceptInvitation);
export default r;
