import mongoose from 'mongoose';

export const isObjectId = (v) => typeof v === 'string' && /^[a-f\d]{24}$/i.test(v);
export const toObjectId = (v) => new mongoose.Types.ObjectId(String(v));
export const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function slugify(text) {
  return (
    String(text)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^\w\s-]/g, '')
      .trim()
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'workspace'
  );
}

export function pagination({ page = 1, limit = 20 }) {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 50);
  const safePage = Math.max(Number(page) || 1, 1);
  return { page: safePage, limit: safeLimit, skip: (safePage - 1) * safeLimit };
}

export const pageMeta = ({ page, limit }, total) => ({ page, limit, total, pages: Math.max(Math.ceil(total / limit), 1) });

export const stripToExcerpt = (text, n = 180) => {
  const flat = String(text).replace(/\s+/g, ' ').trim();
  return flat.length > n ? `${flat.slice(0, n - 1)}…` : flat;
};
