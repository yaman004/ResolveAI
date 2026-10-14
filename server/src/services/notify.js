import { Notification } from '../models/Notification.js';

export async function notifyUsers(orgId, userIds, { type, title, body = '', link = '' }, exceptUserId = null) {
  try {
    const targets = [...new Set(userIds.map(String))].filter((id) => id !== String(exceptUserId));
    if (!targets.length) return;
    await Notification.insertMany(targets.map((user) => ({ organization: orgId, user, type, title, body: body.slice(0, 500), link })));
  } catch (err) {
    console.error('[notify] failed', err.message);
  }
}
