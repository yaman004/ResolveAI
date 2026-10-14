import { KnowledgeArticle } from '../models/KnowledgeArticle.js';

const STOP = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'of', 'in', 'on', 'for', 'with', 'my', 'me', 'i', 'it', 'this', 'that', 'we', 'you', 'your', 'can', 'could', 'would', 'please', 'hi', 'hello', 'thanks', 'thank', 'have', 'has', 'had', 'be', 'do', 'does', 'did', 'not', 'at', 'as', 'by', 'from', 'about', 'how', 'what', 'when', 'why', 'will']);

export const tokenize = (text) =>
  String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 2 && !STOP.has(t));

/**
 * Lightweight relevance ranking over the organization's published articles.
 * Title matches count most, then tags, then category, then body.
 * Always scoped to a single organization.
 */
export async function findRelevantArticles(orgId, queryText, { limit = 3 } = {}) {
  const terms = [...new Set(tokenize(queryText))];
  if (!terms.length) return [];
  const articles = await KnowledgeArticle.find({ organization: orgId, status: 'published' }).limit(300).lean();
  const scored = articles
    .map((a) => {
      const title = new Set(tokenize(a.title));
      const tags = new Set(a.tags.flatMap(tokenize));
      const category = new Set(tokenize(a.category));
      const bodyTokens = tokenize(a.body);
      const body = new Set(bodyTokens);
      let score = 0;
      for (const t of terms) {
        if (title.has(t)) score += 5;
        if (tags.has(t)) score += 3;
        if (category.has(t)) score += 2;
        if (body.has(t)) score += 1;
      }
      return { article: a, score };
    })
    .filter((s) => s.score >= 3)
    .sort((x, y) => y.score - x.score)
    .slice(0, limit);
  return scored.map((s) => s.article);
}
