import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Inbox as InboxIcon, Plus, Search } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useDebounced, useFetch } from '../hooks/useFetch.js';
import { Avatar, Button, Card, EmptyState, ErrorState, PageHeader, Pagination, PriorityBadge, SkeletonRows, StatusBadge, cx } from '../components/ui.jsx';
import TicketFormModal from '../features/TicketForm.jsx';
import { PRIORITY_OPTIONS, timeAgo } from '../utils/format.js';

const ACTIVE = 'open,in_progress,waiting';
const TABS = [
  { id: 'all', label: 'All', params: {}, count: 'total' },
  { id: 'active', label: 'Unresolved', params: { status: ACTIVE }, count: 'unresolved' },
  { id: 'mine', label: 'Mine', params: { assignee: 'me', status: ACTIVE }, count: 'mine' },
  { id: 'unassigned', label: 'Unassigned', params: { assignee: 'unassigned', status: ACTIVE }, count: 'unassigned' },
  { id: 'open', label: 'Open', params: { status: 'open' }, count: 'open' },
  { id: 'in_progress', label: 'In progress', params: { status: 'in_progress' }, count: 'in_progress' },
  { id: 'waiting', label: 'Waiting', params: { status: 'waiting' }, count: 'waiting' },
  { id: 'resolved', label: 'Resolved', params: { status: 'resolved' }, count: 'resolved' },
];
const SORTS = [
  { v: 'createdAt:desc', l: 'Newest first' }, { v: 'createdAt:asc', l: 'Oldest first' },
  { v: 'updatedAt:desc', l: 'Recently updated' }, { v: 'priority:desc', l: 'Highest priority' }, { v: 'number:asc', l: 'Ticket number' },
];

export default function Inbox() {
  const { orgId, can } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const [sp, setSp] = useSearchParams();
  const tab = TABS.find((t) => t.id === sp.get('tab')) || TABS[0];
  const priority = sp.get('priority') || '';
  const sort = sp.get('sort') || 'createdAt:desc';
  const page = Number(sp.get('page')) || 1;
  const [search, setSearch] = useState(sp.get('q') || '');
  const dq = useDebounced(search);
  const [creating, setCreating] = useState(sp.get('new') === '1');

  const update = (patch) => {
    const next = new URLSearchParams(sp);
    next.delete('new');
    for (const [k, v] of Object.entries(patch)) (v ? next.set(k, v) : next.delete(k));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  useEffect(() => { if ((sp.get('q') || '') !== dq) update({ q: dq }); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps

  const [sortField, order] = sort.split(':');
  const params = useMemo(() => ({ ...tab.params, ...(priority ? { priority } : {}), ...(dq ? { q: dq } : {}), sort: sortField, order, page, limit: 15 }), [tab, priority, dq, sortField, order, page]);
  const list = useFetch(() => api.get('/tickets', params), [orgId, JSON.stringify(params)]);
  const stats = useFetch(() => api.get('/tickets/stats').then((r) => r.data), [orgId]);

  const rows = list.data?.data || [];
  const filtered = Boolean(dq || priority);

  return (
    <>
      <PageHeader title="Inbox" description="Every customer conversation in one place." actions={can('agent') && <Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button>} />
      <Card>
        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 scroll-thin" role="tablist" aria-label="Ticket filters">
          {TABS.map((t) => {
            const n = stats.data?.[t.count];
            const active = t.id === tab.id;
            return (
              <button key={t.id} role="tab" aria-selected={active} onClick={() => update({ tab: t.id === 'all' ? '' : t.id })} className={cx('flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors', active ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}>
                {t.label}{n != null && <span className={cx('rounded-full px-1.5 py-0.5 text-xs tabular-nums', active ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-500')}>{n}</span>}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-3 border-b border-slate-100 p-4">
          <div className="relative min-w-[12rem] flex-1">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-400" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search subject, customer or #number" aria-label="Search tickets" className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <select value={priority} onChange={(e) => update({ priority: e.target.value })} aria-label="Filter by priority" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            <option value="">All priorities</option>{PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => update({ sort: e.target.value === 'createdAt:desc' ? '' : e.target.value })} aria-label="Sort tickets" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20">
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}
          </select>
        </div>

        {list.error && !list.data ? <ErrorState message={list.error} onRetry={list.reload} title="Could not load tickets" /> : list.loading && !list.data ? <SkeletonRows rows={8} /> : rows.length === 0 ? (
          filtered || tab.id !== 'all' ? (
            <EmptyState icon={InboxIcon} title="No tickets match" description="Try a different tab, or clear the search and filters." action={<Button variant="secondary" onClick={() => { setSearch(''); setSp({}, { replace: true }); }}>Clear filters</Button>} />
          ) : (
            <EmptyState icon={InboxIcon} title="Your inbox is empty" description="Create the first ticket to start managing conversations." action={can('agent') && <Button icon={Plus} onClick={() => setCreating(true)}>New ticket</Button>} />
          )
        ) : (
          <div className={cx('transition-opacity', list.loading && 'opacity-60')}>
            <table className="w-full text-left">
              <thead className="sr-only"><tr><th>Priority</th><th>Ticket</th><th>Status</th><th>Assignee</th><th>Updated</th></tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => (
                  <tr key={t.id} onClick={() => nav(`/app/tickets/${t.id}`)} className="cursor-pointer hover:bg-slate-50">
                    <td className="w-24 py-3.5 pl-5 pr-2 align-middle"><PriorityBadge priority={t.priority} /></td>
                    <td className="max-w-0 px-2 py-3.5">
                      <Link to={`/app/tickets/${t.id}`} onClick={(e) => e.stopPropagation()} className="block truncate text-sm font-bold text-slate-900 hover:text-brand-700">{t.subject}</Link>
                      <p className="truncate text-xs text-slate-500">#{t.number} · {t.customerName} · {t.category}</p>
                    </td>
                    <td className="hidden px-2 py-3.5 sm:table-cell"><StatusBadge status={t.status} /></td>
                    <td className="hidden px-2 py-3.5 md:table-cell">{t.assignee ? <span className="flex items-center gap-2 text-sm text-slate-700"><Avatar name={t.assignee.name} size="sm" />{t.assignee.name.split(' ')[0]}</span> : <span className="text-sm text-slate-400">Unassigned</span>}</td>
                    <td className="hidden whitespace-nowrap py-3.5 pl-2 pr-5 text-right text-xs text-slate-500 lg:table-cell">{timeAgo(t.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination meta={list.data.meta} onPage={(p) => update({ page: String(p) })} />
          </div>
        )}
      </Card>
      <TicketFormModal open={creating} onClose={() => { setCreating(false); update({}); }} onSaved={(t) => { toast.success(`Ticket #${t.number} created.`); stats.reload(); nav(`/app/tickets/${t.id}`); }} />
    </>
  );
}
