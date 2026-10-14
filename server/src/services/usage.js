import { Subscription } from '../models/Subscription.js';
import { Membership } from '../models/Membership.js';
import { Invitation } from '../models/Invitation.js';
import { getPlan } from '../config/plans.js';
import { AppError } from '../utils/AppError.js';

export const currentPeriod = (d = new Date()) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;

export async function ensureSubscription(orgId) {
  const period = currentPeriod();
  let sub = await Subscription.findOne({ organization: orgId });
  if (!sub) {
    try {
      sub = await Subscription.create({ organization: orgId, plan: 'free', usagePeriod: period });
    } catch (err) {
      if (err.code !== 11000) throw err;
      sub = await Subscription.findOne({ organization: orgId });
    }
  }
  if (sub.usagePeriod !== period) {
    // Conditional update makes the monthly reset safe under concurrent requests.
    await Subscription.updateOne({ organization: orgId, usagePeriod: { $ne: period } }, { $set: { usagePeriod: period, aiRepliesUsed: 0 } });
    sub = await Subscription.findOne({ organization: orgId });
  }
  return sub;
}

export async function getUsage(orgId) {
  const sub = await ensureSubscription(orgId);
  const plan = getPlan(sub.plan);
  const [members, pendingInvites] = await Promise.all([
    Membership.countDocuments({ organization: orgId }),
    Invitation.countDocuments({ organization: orgId, acceptedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } }),
  ]);
  return {
    plan,
    subscription: sub,
    usage: {
      members,
      pendingInvites,
      aiReplies: sub.aiRepliesUsed,
      period: sub.usagePeriod,
    },
    limits: plan.limits,
  };
}

export async function assertSeatAvailable(orgId, { includePending = true } = {}) {
  const { usage, limits, plan } = await getUsage(orgId);
  const used = usage.members + (includePending ? usage.pendingInvites : 0);
  if (used >= limits.members) {
    throw new AppError(402, `Your ${plan.name} plan allows ${limits.members} members. Upgrade to add more.`, 'MEMBER_LIMIT_REACHED');
  }
}

/** Atomically reserves one AI reply. Throws 402 if the monthly limit is reached. */
export async function reserveAiReply(orgId) {
  const sub = await ensureSubscription(orgId);
  const limit = getPlan(sub.plan).limits.aiRepliesPerMonth;
  const updated = await Subscription.findOneAndUpdate(
    { organization: orgId, aiRepliesUsed: { $lt: limit } },
    { $inc: { aiRepliesUsed: 1 } },
    { new: true }
  );
  if (!updated) {
    throw new AppError(402, `You have used all ${limit} AI-assisted replies included in this month's ${getPlan(sub.plan).name} plan.`, 'AI_LIMIT_REACHED');
  }
  return { used: updated.aiRepliesUsed, limit };
}

export async function refundAiReply(orgId) {
  await Subscription.updateOne({ organization: orgId, aiRepliesUsed: { $gt: 0 } }, { $inc: { aiRepliesUsed: -1 } });
}
