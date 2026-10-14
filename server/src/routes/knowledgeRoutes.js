import { Router } from 'express';
import * as c from '../controllers/knowledgeController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { createArticleBody, idParam, listArticlesQuery, updateArticleBody } from '../validators/schemas.js';

const r = Router();
r.use(requireAuth);
r.get('/', requireOrg('viewer'), validate({ query: listArticlesQuery }), c.listArticles);
r.post('/', requireOrg('agent'), validate({ body: createArticleBody }), c.createArticle);
r.get('/:id', requireOrg('viewer'), validate({ params: idParam }), c.getArticle);
r.patch('/:id', requireOrg('agent'), validate({ params: idParam, body: updateArticleBody }), c.updateArticle);
r.delete('/:id', requireOrg('admin'), validate({ params: idParam }), c.deleteArticle);
export default r;
