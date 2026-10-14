import '../config/mongoose.js';
import mongoose from 'mongoose';
import { PLAN_IDS } from '../config/plans.js';

const subscriptionSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true, unique: true },
    plan: { type: String, enum: PLAN_IDS, default: 'free' },
    status: { type: String, enum: ['active', 'past_due', 'canceled'], default: 'active' },
    // Usage tracking. usagePeriod is a UTC "YYYY-MM" key; counters reset when it changes.
    usagePeriod: { type: String, required: true },
    aiRepliesUsed: { type: Number, default: 0, min: 0 },
    // Billing-ready fields; populated once a payment provider is integrated.
    billingProvider: { type: String, default: null },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
    currentPeriodEnd: { type: Date, default: null },
  },
  { timestamps: true }
);

export const Subscription = mongoose.model('Subscription', subscriptionSchema);
