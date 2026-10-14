import '../config/mongoose.js';
import mongoose from 'mongoose';

export const MESSAGE_TYPES = ['reply', 'note', 'customer'];

const ticketMessageSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Ticket', required: true },
    // reply = customer-facing agent reply, note = internal only, customer = inbound customer message logged by an agent
    type: { type: String, enum: MESSAGE_TYPES, required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    aiAssisted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

ticketMessageSchema.index({ organization: 1, ticket: 1, createdAt: 1 });

export const TicketMessage = mongoose.model('TicketMessage', ticketMessageSchema);
