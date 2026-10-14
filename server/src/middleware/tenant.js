import { Membership } from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, forbidden } from '../utils/AppError.js';
import { isObjectId, toObjectId } from '../utils/helpers.js';
import { hasRole } from '../utils/permissions.js';

/**
 * Resolves the active organization from the X-Org-Id header and verifies the
 * authenticated user is a member with at least `minRole`. The client-supplied
 * id is never trusted on its own: access depends on a Membership record.
 * Must run after requireAuth.
 */
export const requireOrg = (minRole = 'viewer') =>
  asyncHandler(async (req, _res, next) => {
    const raw = req.headers['x-org-id'];
    if (!raw || !isObjectId(String(raw))) throw badRequest('A valid workspace is required (X-Org-Id header).', 'ORG_REQUIRED');
    const membership = await Membership.findOne({ user: req.user._id, organization: toObjectId(raw) });
    if (!membership) throw forbidden('You are not a member of this workspace.', 'NOT_A_MEMBER');
    if (!hasRole(membership.role, minRole)) throw forbidden(`This action requires the ${minRole} role or higher.`, 'INSUFFICIENT_ROLE');
    req.orgId = membership.organization;
    req.membership = membership;
    req.role = membership.role;
    next();
  });
