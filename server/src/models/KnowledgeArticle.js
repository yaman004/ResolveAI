import '../config/mongoose.js';
import mongoose from 'mongoose';

const articleSchema = new mongoose.Schema(
  {
    organization: { type: mongoose.Schema.Types.ObjectId, ref: 'Organization', required: true },
    title: { type: String, required: true, trim: true, maxlength: 160 },
    body: { type: String, required: true, trim: true, maxlength: 20000 },
    category: { type: String, trim: true, maxlength: 60, default: 'General' },
    tags: { type: [String], default: [] },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    publishedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

articleSchema.index({ organization: 1, status: 1, updatedAt: -1 });
articleSchema.index({ organization: 1, category: 1 });

export const KnowledgeArticle = mongoose.model('KnowledgeArticle', articleSchema);
