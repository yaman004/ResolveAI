import { Router } from 'express';
import * as c from '../controllers/orgController.js';
import { requireAuth } from '../middleware/auth.js';
import { requireOrg } from '../middleware/tenant.js';
import { validate } from '../middleware/validate.js';
import { changePlanBody, createOrgBody, idParam, inviteBody, updateMemberBody, updateOrgBody } from '../validators/schemas.js';

// Workspaces the current user can access (no active org needed)
export const orgsRouter = Router();
orgsRouter.use(requireAuth);
orgsRouter.get('/', c.listMyOrgs);
orgsRouter.post('/', validate({ body: createOrgBody }), c.createOrg);

// Everything below acts on the ACTIVE org (X-Org-Id) after membership verification
export const orgRouter = Router();
orgRouter.use(requireAuth);
orgRouter.get('/', requireOrg('viewer'), c.getCurrentOrg);
orgRouter.patch('/', requireOrg('admin'), validate({ body: updateOrgBody }), c.updateOrg);

orgRouter.get('/members', requireOrg('viewer'), c.listMembers);
orgRouter.patch('/members/:id', requireOrg('admin'), validate({ params: idParam, body: updateMemberBody }), c.updateMemberRole);
// Any member may remove themselves (leave); admins may remove others. Enforced in the controller.
orgRouter.delete('/members/:id', requireOrg('viewer'), validate({ params: idParam }), c.removeMember);

orgRouter.get('/invitations', requireOrg('admin'), c.listInvitations);
orgRouter.post('/invitations', requireOrg('admin'), validate({ body: inviteBody }), c.createInvitation);
orgRouter.delete('/invitations/:id', requireOrg('admin'), validate({ params: idParam }), c.revokeInvitation);

orgRouter.get('/billing', requireOrg('viewer'), c.getBilling);
orgRouter.patch('/billing/plan', requireOrg('owner'), validate({ body: changePlanBody }), c.changePlan);
