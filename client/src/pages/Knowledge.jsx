import { useState } from 'react';
import { BookOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounced, useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, Modal, Notice, PageHeader, Pagination, Select, SkeletonRows, Textarea, cx } from '../components/ui.jsx';
import { errorMessage, fieldErrors, timeAgo } from '../utils/format.js';

function ArticleModal({ open, onClose, article, readOnly, onSaved }) {
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastOpen, setLastOpen] = useState(false);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm({ title: article?.title || '', body: article?.body || '', category: article?.category || 'General', tags: (article?.tags || []).join(', '), status: article?.status || 'draft' });
      setErrors({}); setFormError('');
    }
  }
  if (!open || !form) return null;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = async (statusOverride) => {
    const e = {};
    if (form.title.trim().length < 3) e.title = 'Title must be at least 3 characters';
    if (form.body.trim().length < 10) e.body = 'Write at least a sentence or two';
    setErrors(e); setFormError('');
    if (Object.keys(e).length) return;
    setSaving(true);
    const payload = { title: form.title, body: form.body, category: form.category.trim() || 'General', status: statusOverride || form.status, tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean) };
    try {
      const { data } = article ? await api.patch(`/knowledge/${article.id}`, payload) : await api.post('/knowledge', payload);
      onSaved(data, payload.status);
      onClose();
    } catch (err) {
      const d = fieldErrors(err);
      if (Object.keys(d).length) setErrors(d); else setFormError(errorMessage(err));
    } finally { setSaving(false); }
  };

  return (
    <Modal open onClose={onClose} size="lg" title={readOnly ? article.title : article ? 'Edit article' : 'New article'}
      description={readOnly ? `${article.category} · ${article.status === 'published' ? 'Published' : 'Draft'}` : 'Only published articles are used by AI replies and shown in the public help center.'}
      footer={readOnly ? <Button variant="secondary" onClick={onClose}>Close</Button> : (
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button variant="secondary" loading={saving} onClick={() => save('draft')}>Save as draft</Button>
          <Button loading={saving} onClick={() => save('published')}>{article?.status === 'published' ? 'Save and keep published' : 'Publish'}</Button>
        </>
      )}>
      {readOnly ? (
        <div className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{article.body}</div>
      ) : (
        <div className="space-y-4">
          {formError && <Notice tone="error">{formError}</Notice>}
          <Input label="Title" value={form.title} onChange={set('title')} error={errors.title} maxLength={160} />
          <Textarea label="Article" rows={10} value={form.body} onChange={set('body')} error={errors.body} hint="Plain text. Be specific: the AI can only repeat what is written here." maxLength={20000} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Category" value={form.category} onChange={set('category')} maxLength={60} />
            <Input label="Tags" value={form.tags} onChange={set('tags')} hint="Comma-separated, up to 10" error={errors.tags} />
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Knowledge() {
  const { orgId, can } = useAuth();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const q = useDebounced(search);
  const [status, setStatus] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { article?, readOnly? }
  const [deleting, setDeleting] = useState(null);

  const params = { ...(q ? { q } : {}), ...(status ? { status } : {}), ...(category ? { category } : {}), page, limit: 15 };
  const { data, loading, error, reload } = useFetch(() => api.get('/knowledge', params), [orgId, q, status, category, page]);
  const items = data?.data || [];
  const categories = data?.meta.categories || [];

  return (
    <>
      <PageHeader title="Knowledge base" description="The articles your team and the AI assistant answer from." actions={can('agent') && <Button icon={Plus} onClick={() => setModal({})}>New article</Button>} />
      <Card>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Search title, text or tags" aria-label="Search articles" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">All statuses</option><option value="published">Published</option><option value="draft">Draft</option></select>
          <select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} aria-label="Filter by category" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm"><option value="">All categories</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>
        </div>
        {error && !data ? <ErrorState message={error} onRetry={reload} /> : loading && !data ? <SkeletonRows rows={6} /> : items.length === 0 ? (
          q || status || category ? <EmptyState icon={BookOpen} title="No articles match" description="Try different search words or clear the filters." action={<Button variant="secondary" onClick={() => { setSearch(''); setStatus(''); setCategory(''); }}>Clear filters</Button>} />
            : <EmptyState icon={BookOpen} title="Add your first article" description="Write down your refund policy, setup steps or account rules. Published articles ground AI replies and power your public help center." action={can('agent') && <Button icon={Plus} onClick={() => setModal({})}>New article</Button>} />
        ) : (
          <div className={cx(loading && 'opacity-60')}>
            <ul className="divide-y divide-slate-100">
              {items.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-50">
                  <button className="min-w-0 flex-1 text-left" onClick={() => setModal({ article: a, readOnly: !can('agent') })}>
                    <p className="truncate text-sm font-bold text-slate-900">{a.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500">{a.category}{a.tags.length ? ` · ${a.tags.map((t) => `#${t}`).join(' ')}` : ''} · Updated {timeAgo(a.updatedAt)}{a.author ? ` by ${a.author.name}` : ''}</p>
                  </button>
                  <Badge tone={a.status === 'published' ? 'green' : 'slate'}>{a.status === 'published' ? 'Published' : 'Draft'}</Badge>
                  {can('agent') && <Button size="sm" variant="ghost" icon={Pencil} aria-label={`Edit ${a.title}`} onClick={() => setModal({ article: a })} />}
                  {can('admin') && <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" aria-label={`Delete ${a.title}`} onClick={() => setDeleting(a)} />}
                </li>
              ))}
            </ul>
            <Pagination meta={data.meta} onPage={setPage} />
          </div>
        )}
      </Card>
      <ArticleModal open={Boolean(modal)} onClose={() => setModal(null)} article={modal?.article} readOnly={modal?.readOnly}
        onSaved={(a, st) => { toast.success(st === 'published' ? 'Article published.' : 'Draft saved.'); reload(); }} />
      <ConfirmDialog open={Boolean(deleting)} onClose={() => setDeleting(null)} danger title="Delete this article?" message={`“${deleting?.title}” will be permanently deleted and will no longer be used for AI replies.`} confirmLabel="Delete article"
        onConfirm={async () => { try { await api.del(`/knowledge/${deleting.id}`); toast.success('Article deleted.'); reload(); } catch (e) { toast.error(errorMessage(e)); throw e; } }} />
    </>
  );
}
