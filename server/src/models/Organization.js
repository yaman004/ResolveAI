import '../config/mongoose.js';
import mongoose from 'mongoose';

export const DEFAULT_CATEGORIES = ['General', 'Billing', 'Technical', 'Account', 'Feature request'];

const organizationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, minlength: 2, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    ticketCounter: { type: Number, default: 0 },
    settings: {
      supportEmail: { type: String, trim: true, lowercase: true, default: '' },
      categories: { type: [String], default: () => [...DEFAULT_CATEGORIES] },
      helpCenterEnabled: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export const Organization = mongoose.model('Organization', organizationSchema);
