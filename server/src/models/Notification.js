import '../config/mongoose.js';
import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true, maxlength: 200 },
    body: { type: String, default: '', maxlength: 500 },
    link: { type: String, default: '' },
    readAt: { type: Date, default: null },
  },
  { timestamps: true }
);

notificationSchema.index({ organization: 1, user: 1, createdAt: -1 });
notificationSchema.index({ organization: 1, user: 1, readAt: 1 });

export const Notification = mongoose.model('Notification', notificationSchema);
