import { Router } from 'express';
import * as c from '../controllers/ticketController.js';
import * as ai from '../controllers/aiController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { aiReplyBody, createMessageBody, createTicketBody, idParam, listTicketsQuery, updateTicketBody } from '../validators/schemas.js';

const r = Router();
r.use(requireAuth);
r.get('/', requireOrg('viewer'), validate({ query: listTicketsQuery }), c.listTickets);
r.get('/stats', requireOrg('viewer'), c.ticketStats);
r.post('/', requireOrg('agent'), validate({ body: createTicketBody }), c.createTicket);
r.get('/:id', requireOrg('viewer'), validate({ params: idParam }), c.getTicket);
r.patch('/:id', requireOrg('agent'), validate({ params: idParam, body: updateTicketBody }), c.updateTicket);
r.delete('/:id', requireOrg('admin'), validate({ params: idParam }), c.deleteTicket);
r.post('/:id/messages', requireOrg('agent'), validate({ params: idParam, body: createMessageBody }), c.addMessage);
// Generates a DRAFT only. Nothing is sent to the customer until an agent posts it as a reply.
r.post('/:id/ai-reply', aiLimiter, requireOrg('agent'), validate({ params: idParam, body: aiReplyBody }), ai.suggestReply);
export default r;
