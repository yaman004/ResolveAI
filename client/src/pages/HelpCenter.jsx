import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, LifeBuoy, Search } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDebounced, useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, EmptyState, ErrorState, Input, SkeletonRows } from '../components/ui.jsx';
import { formatDate } from '../utils/format.js';

function ArticleView({ slug, articleId }) {
  const { data, loading, error, reload } = useFetch(() => api.get(`/public/help/${slug}/articles/${articleId}`).then((r) => r.data), [slug, articleId]);
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <Link to={`/help/${slug}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 hover:underline"><ArrowLeft className="h-4 w-4" aria-hidden />All articles</Link>
      {loading && !data ? <div className="mt-6"><SkeletonRows rows={4} /></div> : error ? <ErrorState message={error} onRetry={reload} title="Article not available" /> : (
        <article className="mt-6">
          <Badge tone="violet">{data.article.category}</Badge>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{data.article.title}</h1>
          <p className="mt-2 text-sm text-slate-500">{data.organization.name} · Updated {formatDate(data.article.updatedAt)}</p>
          <div className="mt-8 whitespace-pre-wrap text-[15px] leading-7 text-slate-700">{data.article.body}</div>
          {data.organization.supportEmail && (
            <Card className="mt-10 p-5 text-sm text-slate-600">Still need help? Contact <a className="font-bold text-brand-700 hover:underline" href={`mailto:${data.organization.supportEmail}`}>{data.organization.supportEmail}</a>.</Card>
          )}
        </article>
      )}
    </div>
  );
}

function ArticleList({ slug }) {
  const [q, setQ] = useState('');
  const dq = useDebounced(q);
  const { data, loading, error, reload } = useFetch(() => api.get(`/public/help/${slug}`, dq ? { q: dq } : undefined).then((r) => r.data), [slug, dq]);
  const groups = (data?.articles || []).reduce((m, a) => ((m[a.category] ||= []).push(a), m), {});
  return (
    <>
      <div className="bg-gradient-to-b from-brand-50 to-white px-4 py-14 text-center sm:px-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">{data ? `${data.organization.name} help center` : 'Help center'}</h1>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">Find answers to common questions.</p>
        <div className="relative mx-auto mt-7 max-w-xl">
          <Search className="pointer-events-none absolute left-3.5 top-3 h-4 w-4 text-slate-400" aria-hidden />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search articles" aria-label="Search articles" className="h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-4 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
        </div>
      </div>
      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        {error ? <ErrorState message={error} onRetry={reload} title="Help center not available" /> : loading && !data ? <SkeletonRows rows={5} /> : data.articles.length === 0 ? (
          <EmptyState icon={BookOpen} title={dq ? 'No articles match your search' : 'No articles yet'} description={dq ? 'Try different words, or clear the search.' : 'This help center has no published articles yet. Check back soon.'} />
        ) : Object.entries(groups).map(([cat, items]) => (
          <section key={cat} className="mt-8">
            <h2 className="mb-3 text-sm font-bold text-slate-500">{cat}</h2>
            <Card className="divide-y divide-slate-100">
              {items.map((a) => (
                <Link key={a.id} to={`/help/${slug}/articles/${a.id}`} className="block px-5 py-4 hover:bg-slate-50">
                  <p className="font-bold text-slate-900">{a.title}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-500">{a.excerpt}</p>
                </Link>
              ))}
            </Card>
          </section>
        ))}
      </div>
    </>
  );
}

export default function HelpCenter() {
  const { slug, articleId } = useParams();
  const { organization } = useAuth();
  const nav = useNavigate();
  const [input, setInput] = useState('');
  useEffect(() => { if (!slug && organization?.slug) setInput(organization.slug); }, [slug, organization]);

  if (slug && articleId) return <ArticleView slug={slug} articleId={articleId} />;
  if (slug) return <ArticleList slug={slug} />;
  return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><LifeBuoy className="h-6 w-6" aria-hidden /></div>
      <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-slate-900">Help center</h1>
      <p className="mt-2 text-sm text-slate-600">Each company has its own help center. Enter the workspace address to open it.</p>
      <form className="mt-6 space-y-3 text-left" onSubmit={(e) => { e.preventDefault(); const s = input.trim().toLowerCase(); if (s) nav(`/help/${encodeURIComponent(s)}`); }}>
        <Input label="Workspace address" placeholder="acme-cloud" value={input} onChange={(e) => setInput(e.target.value)} hint="Example: acme-cloud (the seeded demo workspace)" />
        <Button type="submit" className="w-full" disabled={!input.trim()}>Open help center</Button>
      </form>
    </div>
  );
}
