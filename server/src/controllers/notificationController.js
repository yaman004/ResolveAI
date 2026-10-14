import { Notification } from '../models/Notification.js';
import { asyncHandler } from '../utils/asyncHandler.js';

// Notifications are scoped to BOTH the active organization and the current user.
export const listNotifications = asyncHandler(async (req, res) => {
  const scope = { organization: req.orgId, user: req.user._id };
  const [items, unread] = await Promise.all([
    Notification.find(scope).sort({ createdAt: -1 }).limit(30),
    Notification.countDocuments({ ...scope, readAt: null }),
  ]);
  res.json({ data: items, meta: { unread } });
});

export const markRead = asyncHandler(async (req, res) => {
  await Notification.updateOne({ _id: req.params.id, organization: req.orgId, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ data: { ok: true } });
});

export const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ organization: req.orgId, user: req.user._id, readAt: null }, { $set: { readAt: new Date() } });
  res.json({ data: { ok: true } });
});
