import '../config/mongoose.js';
import mongoose from 'mongoose';
import { ROLES } from '../utils/permissions.js';

const membershipSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    role: { type: String, enum: ROLES, required: true, default: 'agent' },
  },
  { timestamps: true }
);

membershipSchema.index({ user: 1, organization: 1 }, { unique: true });
membershipSchema.index({ organization: 1, role: 1 });

export const Membership = mongoose.model('Membership', membershipSchema);
