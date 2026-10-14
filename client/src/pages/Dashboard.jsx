import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, Clock, Inbox, Sparkles, UserX } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Avatar, Button, Card, CardHeader, EmptyState, ErrorState, Notice, PageHeader, PriorityBadge, Skeleton, StatusBadge } from '../components/ui.jsx';
import { formatHours, timeAgo } from '../utils/format.js';

function Stat({ label, value, icon: Icon, to, hint, tone = 'text-brand-600 bg-brand-50' }) {
  return (
    <Link to={to} className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-card transition-colors hover:border-brand-300">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-500">{label}</span>
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${tone}`}><Icon className="h-4 w-4" aria-hidden /></span>
      </div>
      <p className="mt-3 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">{value ?? <Skeleton className="h-8 w-14" />}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Link>
  );
}

export default function Dashboard() {
  const { user, orgId, can } = useAuth();
  const stats = useFetch(() => api.get('/tickets/stats').then((r) => r.data), [orgId]);
  const analytics = useFetch(() => api.get('/analytics', { range: 30 }).then((r) => r.data), [orgId]);
  const queue = useFetch(() => api.get('/tickets', { status: 'open,in_progress,waiting', sort: 'priority', order: 'desc', limit: 6 }), [orgId]);
  const ai = useFetch(() => api.get('/ai/status').then((r) => r.data), [orgId]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const s = stats.data;
  const a = analytics.data;

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name.split(' ')[0]}`} description="Here’s where support stands right now." actions={can('agent') && <Link to="/app/inbox?new=1"><Button>New ticket</Button></Link>} />
      {ai.data && !ai.data.configured && can('agent') && (
        <div className="mb-6"><Notice tone="info" title="AI reply suggestions are not set up yet">Add <code className="rounded bg-white/70 px-1 font-mono text-xs">AI_API_KEY</code> to the server’s <code className="rounded bg-white/70 px-1 font-mono text-xs">.env</code> file and restart to turn them on. Everything else works without it.</Notice></div>
      )}
      {stats.error ? <Card><ErrorState message={stats.error} onRetry={stats.reload} /></Card> : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Open tickets" value={s?.unresolved} icon={Inbox} to="/app/inbox?tab=active" hint="Not yet resolved" />
          <Stat label="Urgent" value={s?.urgent} icon={AlertTriangle} to="/app/inbox?tab=active&priority=urgent" tone="text-red-600 bg-red-50" hint="Unresolved and urgent" />
          <Stat label="Unassigned" value={s?.unassigned} icon={UserX} to="/app/inbox?tab=unassigned" tone="text-amber-700 bg-amber-50" hint="Waiting for an owner" />
          <Stat label="Avg. resolution" value={a ? formatHours(a.avgResolutionHours) : undefined} icon={Clock} to="/app/analytics" tone="text-emerald-700 bg-emerald-50" hint={a ? (a.avgResolutionHours == null ? 'No resolved tickets in 30 days' : `${a.resolvedSampleSize} resolved, last 30 days`) : ''} />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader title="Needs attention" description="Unresolved tickets, highest priority first" action={<Link to="/app/inbox" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:underline">Open inbox<ArrowRight className="h-4 w-4" aria-hidden /></Link>} />
          {queue.error ? <ErrorState message={queue.error} onRetry={queue.reload} /> : queue.loading && !queue.data ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-12" />)}</div>
          ) : queue.data.data.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing waiting on you" description="Unresolved tickets will appear here. Create one to see the workflow end to end." action={can('agent') && <Link to="/app/inbox?new=1"><Button>Create a ticket</Button></Link>} />
          ) : (
            <ul className="divide-y divide-slate-100">
              {queue.data.data.map((t) => (
                <li key={t.id}>
                  <Link to={`/app/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{t.subject}</p><p className="truncate text-xs text-slate-500">#{t.number} · {t.customerName} · {timeAgo(t.updatedAt)}</p></div>
                    <span className="hidden sm:block"><StatusBadge status={t.status} /></span>
                    <PriorityBadge priority={t.priority} />
                    {t.assignee ? <Avatar name={t.assignee.name} size="sm" /> : <span className="h-6 w-6" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title="Recent activity" />
          {analytics.error ? <ErrorState message={analytics.error} onRetry={analytics.reload} /> : !a ? (
            <div className="space-y-3 p-5">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}</div>
          ) : a.recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" description="Changes to tickets, articles and your team are recorded here." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {a.recentActivity.slice(0, 8).map((r) => (
                <li key={r.id} className="flex gap-3 px-5 py-3"><Avatar name={r.actor} size="sm" /><div className="min-w-0"><p className="text-sm text-slate-700">{r.summary}</p><p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p></div></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {ai.data?.configured && can('agent') && (
        <p className="mt-6 flex items-center gap-2 text-xs text-slate-500"><Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden />AI replies this month: {ai.data.used} of {ai.data.limit} used · model {ai.data.model}</p>
      )}
    </>
  );
}
