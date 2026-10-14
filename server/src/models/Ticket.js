import '../config/mongoose.js';
import mongoose from 'mongoose';

export const TICKET_STATUSES = ['open', 'in_progress', 'waiting', 'resolved'];
export const TICKET_PRIORITIES = ['low', 'medium', 'high', 'urgent'];
export const PRIORITY_RANK = { low: 1, medium: 2, high: 3, urgent: 4 };

const ticketSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    number: { type: Number, required: true },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, required: true, trim: true, maxlength: 10000 },
    customerName: { type: String, required: true, trim: true, maxlength: 120 },
    customerEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
    status: { type: String, enum: TICKET_STATUSES, default: 'open' },
    priority: { type: String, enum: TICKET_PRIORITIES, default: 'medium' },
    priorityRank: { type: Number, default: 2 },
    category: { type: String, trim: true, maxlength: 60, default: 'General' },
    assignee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
    lastMessageAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ticketSchema.pre('validate', function setRank(next) {
  this.priorityRank = PRIORITY_RANK[this.priority] || 2;
  next();
});

ticketSchema.index({ organization: 1, number: 1 }, { unique: true });
ticketSchema.index({ organization: 1, status: 1, priorityRank: -1, createdAt: -1 });
ticketSchema.index({ organization: 1, assignee: 1, status: 1 });
ticketSchema.index({ organization: 1, customerEmail: 1 });
ticketSchema.index({ organization: 1, createdAt: -1 });
ticketSchema.index({ organization: 1, resolvedAt: -1 });

export const Ticket = mongoose.model('Ticket', ticketSchema);
