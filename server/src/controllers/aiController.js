import { Ticket } from '../models/Ticket.js';
import { TicketMessage } from '../models/TicketMessage.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { Organization } from '../models/Organization.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { config } from '../config/env.js';
import { generateReply, isAiConfigured } from '../services/aiService.js';
import { findRelevantArticles } from '../services/knowledge.js';
import { refundAiReply, reserveAiReply, getUsage } from '../services/usage.js';
import { logAudit } from '../services/audit.js';

export const aiStatus = asyncHandler(async (req, res) => {
  const { usage, limits } = await getUsage(req.orgId);
  res.json({ data: { configured: isAiConfigured(), model: isAiConfigured() ? config.ai.model : null, used: usage.aiReplies, limit: limits.aiRepliesPerMonth } });
});

export const suggestReply = asyncHandler(async (req, res) => {
  const ticket = await Ticket.findOne({ _id: req.params.id, organization: req.orgId });
  if (!ticket) throw notFound('Ticket not found');

  // Fail fast (before touching usage counters) if AI is not configured.
  if (!isAiConfigured()) await generateReply({});

  const history = await TicketMessage.find({ organization: req.orgId, ticket: ticket._id, type: { $in: ['reply', 'customer'] } }).sort({ createdAt: -1 }).limit(10);
  const messages = history.reverse();

  let articles;
  if (req.body.articleIds?.length) {
    // Explicit selection is still scoped to this organization and to published content.
    articles = await KnowledgeArticle.find({ _id: { $in: req.body.articleIds }, organization: req.orgId, status: 'published' }).lean();
  } else {
    const queryText = [ticket.subject, ticket.category, ticket.description, ...messages.filter((m) => m.type === 'customer').map((m) => m.body)].join(' ');
    articles = await findRelevantArticles(req.orgId, queryText, { limit: 3 });
  }

  const org = await Organization.findById(req.orgId).select('name');
  const usage = await reserveAiReply(req.orgId);
  try {
    const result = await generateReply({
      ticket,
      messages,
      articles,
      agentName: req.user.name.split(' ')[0],
      orgName: org?.name || 'the company',
    });
    await logAudit(req, { action: 'ai.reply_generated', entityType: 'ticket', entityId: ticket._id, summary: `${req.user.name} generated an AI draft for #${ticket.number}`, meta: { articles: articles.length, confidence: result.confidence } });
    res.json({
      data: {
        suggestion: result.reply,
        confidence: result.confidence,
        escalationNote: result.escalationNote,
        model: result.model,
        sources: articles.map((a) => ({ id: String(a._id), title: a.title })),
        usage,
      },
    });
  } catch (err) {
    await refundAiReply(req.orgId); // Failed generations do not count against the plan.
    throw err;
  }
});
