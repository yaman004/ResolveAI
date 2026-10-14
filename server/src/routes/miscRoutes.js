import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import * as analytics from '../controllers/analyticsController.js';
import * as notifications from '../controllers/notificationController.js';
import * as ai from '../controllers/aiController.js';
import * as pub from '../controllers/publicController.js';
import { analyticsQuery, helpArticleParams, helpQuery, helpSlugParam, idParam } from '../validators/schemas.js';

export const analyticsRouter = Router();
analyticsRouter.get('/', requireAuth, requireOrg('viewer'), validate({ query: analyticsQuery }), analytics.getAnalytics);

export const notificationRouter = Router();
notificationRouter.use(requireAuth);
notificationRouter.get('/', requireOrg('viewer'), notifications.listNotifications);
notificationRouter.post('/read-all', requireOrg('viewer'), notifications.markAllRead);
notificationRouter.patch('/:id/read', requireOrg('viewer'), validate({ params: idParam }), notifications.markRead);

export const aiRouter = Router();
aiRouter.get('/status', requireAuth, requireOrg('viewer'), ai.aiStatus);

export const publicRouter = Router();
publicRouter.get('/plans', pub.listPlans);
publicRouter.get('/help/:slug', validate({ params: helpSlugParam, query: helpQuery }), pub.helpCenter);
publicRouter.get('/help/:slug/articles/:articleId', validate({ params: helpArticleParams }), pub.helpArticle);
