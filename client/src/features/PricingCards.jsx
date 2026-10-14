import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Button, ErrorState, Skeleton, cx } from '../components/ui.jsx';

export default function PricingCards() {
  const { data, loading, error, reload } = useFetch(() => api.get('/public/plans').then((r) => r.data), []);
  if (error) return <ErrorState message={error} onRetry={reload} title="Could not load pricing" />;
  if (loading && !data) return <div className="grid gap-5 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-96 rounded-2xl" />)}</div>;
  return (
    <div className="grid items-stretch gap-5 md:grid-cols-3">
      {data.map((p) => {
        const featured = p.id === 'pro';
        return (
          <div key={p.id} className={cx('flex flex-col rounded-2xl border p-7', featured ? 'border-brand-500 bg-navy-900 text-white shadow-hero md:-my-3 md:py-10' : 'border-slate-200 bg-white shadow-card')}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-extrabold">{p.name}</h3>
              {featured && <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">Most popular</span>}
            </div>
            <p className={cx('mt-1 text-sm', featured ? 'text-slate-300' : 'text-slate-500')}>{p.description}</p>
            <p className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold tracking-tight">${p.priceMonthly}</span>
              <span className={cx('text-sm font-medium', featured ? 'text-slate-400' : 'text-slate-500')}>/ month</span>
            </p>
            <ul className="mt-6 flex-1 space-y-3 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2.5"><Check className={cx('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-brand-300' : 'text-brand-600')} aria-hidden />{f}</li>
              ))}
            </ul>
            <Link to="/register" className="mt-8"><Button variant={featured ? 'primary' : 'secondary'} className={cx('w-full', featured && 'bg-brand-500 hover:bg-brand-400')} size="lg">{p.priceMonthly === 0 ? 'Start for free' : `Start with ${p.name}`}</Button></Link>
          </div>
        );
      })}
    </div>
  );
}
