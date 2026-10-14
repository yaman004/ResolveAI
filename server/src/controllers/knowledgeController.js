import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { escapeRegex, pageMeta, pagination } from '../utils/helpers.js';
import { logAudit } from '../services/audit.js';

const AUTHOR = { path: 'author', select: 'name' };

const findArticle = async (req) => {
  const a = await KnowledgeArticle.findOne({ _id: req.params.id, organization: req.orgId }).populate(AUTHOR);
  if (!a) throw notFound('Article not found');
  return a;
};

export const listArticles = asyncHandler(async (req, res) => {
  const q = req.validQuery;
  const filter = { organization: req.orgId };
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = q.category;
  if (q.q) {
    const rx = new RegExp(escapeRegex(q.q), 'i');
    filter.$or = [{ title: rx }, { body: rx }, { tags: rx }];
  }
  const p = pagination(q);
  const [items, total, categories] = await Promise.all([
    KnowledgeArticle.find(filter).populate(AUTHOR).sort({ updatedAt: -1 }).skip(p.skip).limit(p.limit),
    KnowledgeArticle.countDocuments(filter),
    KnowledgeArticle.distinct('category', { organization: req.orgId }),
  ]);
  res.json({ data: items, meta: { ...pageMeta(p, total), categories: categories.sort() } });
});

export const getArticle = asyncHandler(async (req, res) => res.json({ data: await findArticle(req) }));

export const createArticle = asyncHandler(async (req, res) => {
  const b = req.body;
  const article = await KnowledgeArticle.create({
    organization: req.orgId,
    title: b.title,
    body: b.body,
    category: b.category,
    tags: b.tags,
    status: b.status,
    publishedAt: b.status === 'published' ? new Date() : null,
    author: req.user._id,
    updatedBy: req.user._id,
  });
  await article.populate(AUTHOR);
  await logAudit(req, { action: 'article.created', entityType: 'article', entityId: article._id, summary: `${req.user.name} created the article “${article.title}”` });
  res.status(201).json({ data: article });
});

export const updateArticle = asyncHandler(async (req, res) => {
  const article = await findArticle(req);
  const b = req.body;
  for (const key of ['title', 'body', 'category', 'tags']) if (b[key] !== undefined) article[key] = b[key];
  if (b.status !== undefined && b.status !== article.status) {
    article.status = b.status;
    article.publishedAt = b.status === 'published' ? new Date() : null;
  }
  article.updatedBy = req.user._id;
  await article.save();
  await logAudit(req, { action: 'article.updated', entityType: 'article', entityId: article._id, summary: `${req.user.name} updated the article “${article.title}”${b.status ? ` (${article.status})` : ''}` });
  res.json({ data: article });
});

export const deleteArticle = asyncHandler(async (req, res) => {
  const article = await findArticle(req);
  await article.deleteOne();
  await logAudit(req, { action: 'article.deleted', entityType: 'article', entityId: article._id, summary: `${req.user.name} deleted the article “${article.title}”` });
  res.json({ data: { ok: true } });
});
