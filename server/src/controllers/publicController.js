import { Organization } from '../models/Organization.js';
import { KnowledgeArticle } from '../models/KnowledgeArticle.js';
import { PLANS } from '../config/plans.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { notFound } from '../utils/AppError.js';
import { escapeRegex, stripToExcerpt } from '../utils/helpers.js';

export const listPlans = (_req, res) => res.json({ data: Object.values(PLANS) });

async function helpOrg(slug) {
  const org = await Organization.findOne({ slug });
  if (!org || !org.settings.helpCenterEnabled) throw notFound('This help center does not exist.', 'HELP_CENTER_NOT_FOUND');
  return org;
}

// Public endpoints only ever return PUBLISHED articles and no internal fields.
export const helpCenter = asyncHandler(async (req, res) => {
  const org = await helpOrg(req.params.slug);
  const filter = { organization: org._id, status: 'published' };
  const { q } = req.validQuery;
  if (q) {
    const rx = new RegExp(escapeRegex(q), 'i');
    filter.$or = [{ title: rx }, { body: rx }, { tags: rx }];
  }
  const articles = await KnowledgeArticle.find(filter).sort({ updatedAt: -1 }).limit(100);
  res.json({
    data: {
      organization: { name: org.name, slug: org.slug, supportEmail: org.settings.supportEmail },
      articles: articles.map((a) => ({ id: a.id, title: a.title, category: a.category, tags: a.tags, excerpt: stripToExcerpt(a.body), updatedAt: a.updatedAt })),
    },
  });
});

export const helpArticle = asyncHandler(async (req, res) => {
  const org = await helpOrg(req.params.slug);
  const a = await KnowledgeArticle.findOne({ _id: req.params.articleId, organization: org._id, status: 'published' });
  if (!a) throw notFound('Article not found');
  res.json({
    data: {
      organization: { name: org.name, slug: org.slug, supportEmail: org.settings.supportEmail },
      article: { id: a.id, title: a.title, body: a.body, category: a.category, tags: a.tags, updatedAt: a.updatedAt },
    },
  });
});
