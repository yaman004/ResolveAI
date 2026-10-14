import { Ticket, TICKET_PRIORITIES, TICKET_STATUSES } from '../models/Ticket.js';
import { AuditLog } from '../models/AuditLog.js';
import { User } from '../models/User.js';
import { asyncHandler } from '../utils/asyncHandler.js';

const dayKey = (d) => d.toISOString().slice(0, 10);

export const getAnalytics = asyncHandler(async (req, res) => {
  const days = Number(req.validQuery.range);
  const now = new Date();
  const since = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (days - 1)));
  const org = req.orgId;
  const dayGroup = (field) => ({ $dateToString: { format: '%Y-%m-%d', date: field, timezone: 'UTC' } });

  const [statusAll, urgentOpen, createdByDay, resolvedByDay, inRangeStatus, inRangePriority, resolution, workload, unassigned, recent] = await Promise.all([
    Ticket.aggregate([{ $match: { organization: org } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.countDocuments({ organization: org, priority: 'urgent', status: { $ne: 'resolved' } }),
    Ticket.aggregate([{ $match: { organization: org, createdAt: { $gte: since } } }, { $group: { _id: dayGroup('$createdAt'), count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: { organization: org, resolvedAt: { $gte: since } } }, { $group: { _id: dayGroup('$resolvedAt'), count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: { organization: org, createdAt: { $gte: since } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Ticket.aggregate([{ $match: { organization: org, createdAt: { $gte: since } } }, { $group: { _id: '$priority', count: { $sum: 1 } } }]),
    Ticket.aggregate([
      { $match: { organization: org, status: 'resolved', resolvedAt: { $gte: since } } },
      { $group: { _id: null, avgMs: { $avg: { $subtract: ['$resolvedAt', '$createdAt'] } }, count: { $sum: 1 } } },
    ]),
    Ticket.aggregate([
      { $match: { organization: org, status: { $ne: 'resolved' }, assignee: { $ne: null } } },
      { $group: { _id: '$assignee', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 20 },
    ]),
    Ticket.countDocuments({ organization: org, status: { $ne: 'resolved' }, assignee: null }),
    AuditLog.find({ organization: org }).populate('actor', 'name').sort({ createdAt: -1 }).limit(12),
  ]);

  const counts = Object.fromEntries(TICKET_STATUSES.map((s) => [s, 0]));
  for (const r of statusAll) counts[r._id] = r.count;
  const total = Object.values(counts).reduce((a, b) => a + b, 0);

  const createdMap = new Map(createdByDay.map((r) => [r._id, r.count]));
  const resolvedMap = new Map(resolvedByDay.map((r) => [r._id, r.count]));
  const volume = [];
  for (let i = 0; i < days; i += 1) {
    const key = dayKey(new Date(since.getTime() + i * 86400000));
    volume.push({ date: key, created: createdMap.get(key) || 0, resolved: resolvedMap.get(key) || 0 });
  }

  const toList = (rows, keys) => keys.map((k) => ({ name: k, value: rows.find((r) => r._id === k)?.count || 0 }));
  const users = await User.find({ _id: { $in: workload.map((w) => w._id) } }).select('name');
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));

  const avgMs = resolution[0]?.avgMs;
  res.json({
    data: {
      range: days,
      totals: { total, open: total - counts.resolved, resolved: counts.resolved, urgent: urgentOpen, byStatusAll: counts },
      createdInRange: createdByDay.reduce((a, r) => a + r.count, 0),
      avgResolutionHours: avgMs != null ? Math.round((avgMs / 3600000) * 10) / 10 : null,
      resolvedSampleSize: resolution[0]?.count || 0,
      volume,
      byStatus: toList(inRangeStatus, TICKET_STATUSES),
      byPriority: toList(inRangePriority, TICKET_PRIORITIES),
      workload: [
        ...workload.map((w) => ({ id: String(w._id), name: nameOf.get(String(w._id)) || 'Former member', open: w.count })),
        ...(unassigned ? [{ id: 'unassigned', name: 'Unassigned', open: unassigned }] : []),
      ],
      recentActivity: recent.map((a) => ({ id: a.id, action: a.action, summary: a.summary, actor: a.actor?.name || 'System', createdAt: a.createdAt })),
    },
  });
});
