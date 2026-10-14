import { Ticket, TICKET_PRIORITIES, TICKET_STATUSES } from '../models/Ticket.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { Membership } from '../models/Membership.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { badRequest, notFound } from '../utils/AppError.js';
import { escapeRegex, isObjectId, pageMeta, pagination } from '../utils/helpers.js';
import { hasRole } from '../utils/permissions.js';
import { Organization } from '../models/Organization.js';
import { logAudit } from '../services/audit.js';
import { notifyUsers } from '../services/notify.js';

const ASSIGNEE = { path: 'assignee', select: 'name email' };

async function assertAssignable(orgId, userId) {
  if (!userId) return;
  const m = await Membership.findOne({ organization: orgId, user: userId });
  if (!m || !hasRole(m.role, 'agent')) {
    throw badRequest('Tickets can only be assigned to agents, admins or the owner of this workspace.', 'INVALID_ASSIGNEE');
  }
}

async function findTicketOr404(req, populate = true) {
  // Always scoped by organization: a ticket id from another workspace behaves as "not found".
  const q = Ticket.findOne({ _id: req.params.id, organization: req.orgId });
  if (populate) q.populate(ASSIGNEE);
  const ticket = await q;
  if (!ticket) throw notFound('Ticket not found');
  return ticket;
}

const csv = (s, allowed) => (s || '').split(',').map((x) => x.trim()).filter((x) => allowed.includes(x));

export const listTickets = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const filter = { organization: req.orgId };
  const statuses = csv(q.status, TICKET_STATUSES);
  if (statuses.length) filter.status = { $in: statuses };
  const priorities = csv(q.priority, TICKET_PRIORITIES);
  if (priorities.length) filter.priority = { $in: priorities };
  if (q.assignee === 'me') filter.assignee = req.user._id;
  else if (q.assignee === 'unassigned') filter.assignee = null;
  else if (q.assignee && isObjectId(q.assignee)) filter.assignee = q.assignee;
  if (q.category) filter.category = q.category;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    const or = [{ subject: rx }, { customerName: rx }, { customerEmail: rx }];
    if (/^#?\d{1,9}$/.test(q.q)) or.push({ number: Number(q.q.replace('#', '')) });
    filter.$or = or;
  }
  const sortField = { createdAt: 'createdAt', updatedAt: 'updatedAt', priority: 'priorityRank', number: 'number', status: 'status' }[q.sort];
  const dir = q.order === 'asc' ? 1 : -1;
  const sort = { [sortField]: dir, ...(sortField !== 'createdAt' ? { createdAt: -1 } : {}) };
  const p = pagination(q);
  const [items, total] = await Promise.all([
    Ticket.find(filter).populate(ASSIGNEE).sort(sort).skip(p.skip).limit(p.limit),
    Ticket.countDocuments(filter),
  ]);
  res.json({ data: items, meta: pageMeta(p, total) });
});

export const ticketStats = asyncHandler(async (req, res) => {
  const unresolved = { organization: req.orgId, status: { $ne: 'resolved' } };
  const [byStatus, mine, unassigned, urgent] = await Promise.all([
    Ticket.aggregate([{ $match: { organization: req.orgId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.countDocuments({ ...unresolved, assignee: req.user._id }),
    Ticket.countDocuments({ ...unresolved, assignee: null }),
    Ticket.countDocuments({ ...unresolved, priority: 'urgent' }),
  ]);
  const counts = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0]));
  for (const r of byStatus) counts[r._id] = r.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  res.json({ data: { total, ...counts, unresolved: total - counts.resolved, mine, unassigned, urgent } });
});

export const createTicket = asyncHandler(async (req, res) => {
  const body = req.body;
  await assertAssignable(req.orgId, body.assignee);
  const org = await Organization.findByIdAndUpdate(req.orgId, { $inc: { ticketCounter: 1 } }, { new: true });
  const ticket = await Ticket.create({
    organization: req.orgId,
    number: org.ticketCounter,
    subject: body.subject,
    description: body.description,
    customerName: body.customerName,
    customerEmail: body.customerEmail,
    priority: body.priority,
    category: body.category,
    assignee: body.assignee || null,
    createdBy: req.user._id,
    lastMessageAt: new Date(),
  });
  await ticket.populate(ASSIGNEE);
  await logAudit(req, { action: 'ticket.created', entityType: 'ticket', entityId: ticket._id, summary: `${req.user.name} created #${ticket.number} “${ticket.subject}”` });
  if (ticket.assignee) {
    await notifyUsers(req.orgId, [ticket.assignee._id], { type: 'ticket_assigned', title: `Ticket #${ticket.number} assigned to you`, body: ticket.subject, link: `/app/tickets/${ticket.id}` }, req.user._id);
  }
  res.status(201).json({ data: ticket });
});

export const getTicket = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req);
  const [messages, history] = await Promise.all([
    TicketMessage.find({ organization: req.orgId, ticket: ticket._id }).populate('author', 'name email').sort({ createdAt: 1 }),
    Ticket.find({ organization: req.orgId, customerEmail: ticket.customerEmail, _id: { $ne: ticket._id } })
      .select('number subject status priority createdAt')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);
  res.json({ data: { ticket, messages, customerHistory: history } });
});

export const updateTicket = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req);
  const b = req.body;
  if (b.assignee !== undefined) await assertAssignable(req.orgId, b.assignee);

  const changes = [];
  const prev = { status: ticket.status, priority: ticket.priority, assignee: ticket.assignee?.id || null };
  for (const key of ['subject', 'description', 'customerName', 'customerEmail', 'category', 'priority']) {
    if (b[key] !== undefined) ticket[key] = b[key];
  }
  if (b.status !== undefined && b.status !== ticket.status) {
    ticket.status = b.status;
    ticket.resolvedAt = b.status === 'resolved' ? new Date() : null;
  }
  if (b.assignee !== undefined) ticket.assignee = b.assignee;
  await ticket.save();
  await ticket.populate(ASSIGNEE);

  const label = `#${ticket.number}`;
  if (ticket.status !== prev.status) changes.push({ action: 'ticket.status_changed', summary: `${req.user.name} moved ${label} from ${prev.status} to ${ticket.status}` });
  if (ticket.priority !== prev.priority) changes.push({ action: 'ticket.priority_changed', summary: `${req.user.name} set ${label} priority to ${ticket.priority}` });
  const nowAssignee = ticket.assignee?.id || null;
  if (nowAssignee !== prev.assignee) {
    changes.push({ action: 'ticket.assigned', summary: nowAssignee ? `${req.user.name} assigned ${label} to ${ticket.assignee.name}` : `${req.user.name} unassigned ${label}` });
    if (nowAssignee) {
      await notifyUsers(req.orgId, [nowAssignee], { type: 'ticket_assigned', title: `Ticket ${label} assigned to you`, body: ticket.subject, link: `/app/tickets/${ticket.id}` }, req.user._id);
    }
  }
  if (!changes.length) changes.push({ action: 'ticket.updated', summary: `${req.user.name} edited ${label}` });
  for (const c of changes) await logAudit(req, { ...c, entityType: 'ticket', entityId: ticket._id });
  res.json({ data: ticket });
});

export const deleteTicket = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req, false);
  await TicketMessage.deleteMany({ organization: req.orgId, ticket: ticket._id });
  await ticket.deleteOne();
  await logAudit(req, { action: 'ticket.deleted', entityType: 'ticket', entityId: ticket._id, summary: `${req.user.name} deleted #${ticket.number} “${ticket.subject}”` });
  res.json({ data: { ok: true } });
});

export const addMessage = asyncHandler(async (req, res) => {
  const ticket = await findTicketOr404(req, false);
  const { type, body, aiAssisted } = req.body;
  const message = await TicketMessage.create({
    organization: req.orgId,
    ticket: ticket._id,
    type,
    body,
    author: req.user._id,
    aiAssisted: type === 'reply' ? Boolean(aiAssisted) : false,
  });
  await Ticket.updateOne({ _id: ticket._id, organization: req.orgId }, { $set: { lastMessageAt: message.createdAt } });
  await message.populate('author', 'name email');
  const verb = { reply: 'replied to', note: 'added an internal note to', customer: 'logged a customer message on' }[type];
  await logAudit(req, { action: `ticket.message_${type}`, entityType: 'ticket', entityId: ticket._id, summary: `${req.user.name} ${verb} #${ticket.number}` });
  if (ticket.assignee && type !== 'reply') {
    await notifyUsers(req.orgId, [ticket.assignee], { type: 'ticket_activity', title: type === 'note' ? `New internal note on #${ticket.number}` : `Customer message on #${ticket.number}`, body: body.slice(0, 140), link: `/app/tickets/${ticket.id}` }, req.user._id);
  }
  res.status(201).json({ data: message });
});
