import { AuditLog } from '../models/AuditLog.js';

export async function logAudit(req, { action, entityType = '', entityId = null, summary, meta }) {
  try {
    await AuditLog.create({ organization: req.orgId, actor: req.user?._id ?? null, action, entityType, entityId, summary: summary.slice(0, 300), meta });
  } catch (err) {
    // Audit failures must never break the user's action.
    console.error('[audit] failed to write log', err.message);
  }
}
