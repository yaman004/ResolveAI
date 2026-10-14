import { Organization } from '../models/Organization.js';
import { Membership } from '../models/Membership.js';
import { Invitation } from '../models/Invitation.js';
import { Ticket } from '../models/Ticket.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { config } from '../config/env.js';
import { PLANS, getPlan } from '../config/plans.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { AppError, badRequest, conflict, forbidden, notFound } from '../utils/AppError.js';
import { slugify, toObjectId } from '../utils/helpers.js';
import { hasRole } from '../utils/permissions.js';
import { hashToken, randomToken } from '../utils/token.js';
import { logAudit } from '../services/audit.js';
import { notifyUsers } from '../services/notify.js';
import { assertSeatAvailable, currentPeriod, getUsage } from '../services/usage.js';

const memberDto = (m) => ({
  id: m.id,
  role: m.role,
  joinedAt: m.createdAt,
  user: m.user ? { id: m.user.id, name: m.user.name, email: m.user.email } : null,
});

// ---------- workspaces ----------
export const createOrg = asyncHandler(async (req, res) => {
  const owned = await Membership.countDocuments({ user: req.user._id, role: 'owner' });
  if (owned >= 10) throw forbidden('You can own at most 10 workspaces.', 'WORKSPACE_LIMIT');
  const base = slugify(req.body.name);
  let slug = base;
  for (let i = 0; i < 6 && (await Organization.exists({ slug })); i += 1) {
    slug = `${base}-${randomToken().slice(0, 4)}`;
  }
  const org = await Organization.create({ name: req.body.name, slug, createdBy: req.user._id });
  await Membership.create({ user: req.user._id, organization: org._id, role: 'owner' });
  await Subscription.create({ organization: org._id, plan: 'free', usagePeriod: currentPeriod() });
  req.orgId = org._id;
  await logAudit(req, { action: 'workspace.created', entityType: 'organization', entityId: org._id, summary: `${req.user.name} created the workspace ${org.name}` });
  res.status(201).json({ data: { organization: org, role: 'owner' } });
});

export const listMyOrgs = asyncHandler(async (req, res) => {
  const memberships = await Membership.find({ user: req.user._id }).populate('organization', 'name slug');
  res.json({ data: memberships.filter((m) => m.organization).map((m) => ({ role: m.role, organization: m.organization })) });
});

export const getCurrentOrg = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.orgId);
  if (!org) throw notFound('Workspace not found');
  const { plan, usage, limits } = await getUsage(req.orgId);
  res.json({ data: { organization: org, role: req.role, plan: { id: plan.id, name: plan.name }, usage, limits } });
});

export const updateOrg = asyncHandler(async (req, res) => {
  const org = await Organization.findById(req.orgId);
  const { name, supportEmail, categories, helpCenterEnabled } = req.body;
  if (name !== undefined) org.name = name;
  if (supportEmail !== undefined) org.settings.supportEmail = supportEmail;
  if (categories !== undefined) org.settings.categories = [...new Set(categories)];
  if (helpCenterEnabled !== undefined) org.settings.helpCenterEnabled = helpCenterEnabled;
  await org.save();
  await logAudit(req, { action: 'workspace.updated', entityType: 'organization', entityId: org._id, summary: `${req.user.name} updated workspace settings` });
  res.json({ data: { organization: org } });
});

// ---------- members ----------
export const listMembers = asyncHandler(async (req, res) => {
  const members = await Membership.find({ organization: req.orgId }).populate('user', 'name email').sort({ createdAt: 1 });
  res.json({ data: members.map(memberDto) });
});

export const updateMemberRole = asyncHandler(async (req, res) => {
  const target = await Membership.findOne({ _id: req.params.id, organization: req.orgId }).populate('user', 'name email');
  if (!target) throw notFound('Member not found');
  const { role } = req.body;
  if (role === 'owner') throw badRequest('Ownership transfer is not supported in this version.', 'OWNER_TRANSFER_UNSUPPORTED');
  if (target.role === 'owner') throw forbidden('The workspace owner’s role cannot be changed.', 'OWNER_PROTECTED');
  if (String(target.user._id) === String(req.user._id)) throw forbidden('You cannot change your own role.', 'SELF_ROLE_CHANGE');
  // Only owners can grant or change the admin role.
  if (req.role !== 'owner' && (role === 'admin' || target.role === 'admin')) throw forbidden('Only the owner can manage admins.', 'INSUFFICIENT_ROLE');
  const previous = target.role;
  target.role = role;
  await target.save();
  if (!hasRole(role, 'agent')) {
    await Ticket.updateMany({ organization: req.orgId, assignee: target.user._id, status: { $ne: 'resolved' } }, { $set: { assignee: null } });
  }
  await logAudit(req, { action: 'member.role_changed', entityType: 'membership', entityId: target._id, summary: `${req.user.name} changed ${target.user.name} from ${previous} to ${role}` });
  await notifyUsers(req.orgId, [target.user._id], { type: 'role_changed', title: `Your role is now ${role}`, link: '/app/team' }, req.user._id);
  res.json({ data: memberDto(target) });
});

export const removeMember = asyncHandler(async (req, res) => {
  const target = await Membership.findOne({ _id: req.params.id, organization: req.orgId }).populate('user', 'name email');
  if (!target) throw notFound('Member not found');
  const isSelf = String(target.user._id) === String(req.user._id);
  if (target.role === 'owner') throw forbidden('The workspace owner cannot be removed.', 'OWNER_PROTECTED');
  if (!isSelf && req.role !== 'owner' && target.role === 'admin') throw forbidden('Only the owner can remove admins.', 'INSUFFICIENT_ROLE');
  if (!isSelf && !hasRole(req.role, 'admin')) throw forbidden();
  await target.deleteOne();
  await Ticket.updateMany({ organization: req.orgId, assignee: target.user._id, status: { $ne: 'resolved' } }, { $set: { assignee: null } });
  await logAudit(req, { action: 'member.removed', entityType: 'membership', entityId: target._id, summary: isSelf ? `${target.user.name} left the workspace` : `${req.user.name} removed ${target.user.name}` });
  res.json({ data: { ok: true } });
});

// ---------- invitations ----------
const inviteDto = (i) => ({ id: i.id, email: i.email, role: i.role, expiresAt: i.expiresAt, createdAt: i.createdAt });

export const listInvitations = asyncHandler(async (req, res) => {
  const items = await Invitation.find({ organization: req.orgId, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } }).sort({ createdAt: -1 });
  res.json({ data: items.map(inviteDto) });
});

export const createInvitation = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  if (role === 'admin' && req.role !== 'owner') throw forbidden('Only the owner can invite admins.', 'INSUFFICIENT_ROLE');
  const existingUser = await User.findOne({ email });
  if (existingUser && (await Membership.exists({ organization: req.orgId, user: existingUser._id }))) {
    throw conflict('That person is already a member of this workspace.', 'ALREADY_MEMBER');
  }
  // A re-invite replaces any pending one for the same email.
  await Invitation.updateMany({ organization: req.orgId, email, acceptedAt: null, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await assertSeatAvailable(req.orgId, { includePending: true });
  const token = randomToken();
  const invitation = await Invitation.create({
    organization: req.orgId,
    email,
    role,
    tokenHash: hashToken(token),
    invitedBy: req.user._id,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  });
  await logAudit(req, { action: 'invitation.created', entityType: 'invitation', entityId: invitation._id, summary: `${req.user.name} invited ${email} as ${role}` });
  // No email provider is integrated. The link is returned once so an admin can share it manually.
  res.status(201).json({
    data: {
      invitation: inviteDto(invitation),
      inviteLink: `${config.clientUrl}/invite/${token}`,
      emailDelivery: 'not_configured',
    },
  });
});

export const revokeInvitation = asyncHandler(async (req, res) => {
  const inv = await Invitation.findOne({ _id: req.params.id, organization: req.orgId, acceptedAt: null, revokedAt: null });
  if (!inv) throw notFound('Invitation not found');
  inv.revokedAt = new Date();
  await inv.save();
  await logAudit(req, { action: 'invitation.revoked', entityType: 'invitation', entityId: inv._id, summary: `${req.user.name} revoked the invitation for ${inv.email}` });
  res.json({ data: { ok: true } });
});

async function findValidInvitation(token) {
  const inv = await Invitation.findOne({ tokenHash: hashToken(token) }).populate('organization', 'name slug');
  if (!inv || inv.revokedAt || !inv.organization) throw notFound('This invitation is invalid or was revoked.', 'INVITE_INVALID');
  if (inv.acceptedAt) throw new AppError(410, 'This invitation has already been used.', 'INVITE_USED');
  if (inv.expiresAt < new Date()) throw new AppError(410, 'This invitation has expired. Ask for a new one.', 'INVITE_EXPIRED');
  return inv;
}

export const previewInvitation = asyncHandler(async (req, res) => {
  const inv = await findValidInvitation(req.params.token);
  res.json({ data: { email: inv.email, role: inv.role, organization: { name: inv.organization.name } } });
});

export const acceptInvitation = asyncHandler(async (req, res) => {
  const inv = await findValidInvitation(req.params.token);
  if (inv.email !== req.user.email) {
    throw forbidden(`This invitation was sent to ${inv.email}. Sign in with that account to accept it.`, 'INVITE_EMAIL_MISMATCH');
  }
  const orgId = inv.organization._id;
  if (await Membership.exists({ organization: orgId, user: req.user._id })) throw conflict('You are already a member of this workspace.', 'ALREADY_MEMBER');
  await assertSeatAvailable(orgId, { includePending: false });
  const claimed = await Invitation.findOneAndUpdate({ _id: inv._id, acceptedAt: null, revokedAt: null }, { $set: { acceptedAt: new Date() } });
  if (!claimed) throw new AppError(410, 'This invitation has already been used.', 'INVITE_USED');
  await Membership.create({ user: req.user._id, organization: orgId, role: inv.role });
  req.orgId = orgId;
  await logAudit(req, { action: 'member.joined', entityType: 'organization', entityId: orgId, summary: `${req.user.name} joined as ${inv.role}` });
  const admins = await Membership.find({ organization: orgId, role: { $in: ['owner', 'admin'] } }).select('user');
  await notifyUsers(orgId, admins.map((a) => a.user), { type: 'member_joined', title: `${req.user.name} joined the workspace`, body: `Role: ${inv.role}`, link: '/app/team' }, req.user._id);
  res.json({ data: { organization: { id: String(orgId), name: inv.organization.name }, role: inv.role } });
});

// ---------- billing ----------
export const getBilling = asyncHandler(async (req, res) => {
  const { plan, usage, limits, subscription } = await getUsage(req.orgId);
  res.json({
    data: {
      plan,
      status: subscription.status,
      plans: Object.values(PLANS),
      usage,
      limits,
      paymentProvider: { configured: false },
      planSwitchEnabled: config.allowPlanSwitch,
    },
  });
});

export const changePlan = asyncHandler(async (req, res) => {
  const { plan } = req.body;
  if (!config.allowPlanSwitch) {
    throw new AppError(501, 'Payments are not configured, so plan changes are disabled. See the README for how to connect a payment provider.', 'PAYMENTS_NOT_CONFIGURED');
  }
  const { usage, subscription } = await getUsage(req.orgId);
  const target = getPlan(plan);
  if (usage.members > target.limits.members) {
    throw conflict(`You have ${usage.members} members; the ${target.name} plan allows ${target.limits.members}. Remove members before downgrading.`, 'DOWNGRADE_BLOCKED');
  }
  subscription.plan = plan;
  await subscription.save();
  await logAudit(req, { action: 'billing.plan_changed', entityType: 'subscription', entityId: subscription._id, summary: `${req.user.name} switched the plan to ${target.name} (no payment taken)` });
  res.json({ data: { plan: target } });
});

export { toObjectId };
