import { useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3 } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Avatar, Card, CardHeader, EmptyState, ErrorState, PageHeader, Skeleton } from '../components/ui.jsx';
import { formatHours, statusLabel, priorityLabel, timeAgo } from '../utils/format.js';

const STATUS_COLORS = { open: '#0EA5E9', in_progress: '#6A38F5', waiting: '#F59E0B', resolved: '#10B981' };
const PRIORITY_COLORS = { low: '#94A3B8', medium: '#0EA5E9', high: '#F97316', urgent: '#EF4444' };
const tip = { contentStyle: { borderRadius: 10, border: '1px solid #E2E8F0', fontSize: 12, boxShadow: '0 8px 24px rgba(15,23,42,.12)' } };

function Kpi({ label, value, hint }) {
  return <Card className="p-5"><p className="text-sm font-semibold text-slate-500">{label}</p><p className="mt-2 text-3xl font-extrabold tabular-nums tracking-tight text-slate-900">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</Card>;
}
const shortDate = (d) => new Date(`${d}T00:00:00Z`).toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });

export default function Analytics() {
  const { orgId } = useAuth();
  const [range, setRange] = useState('30');
  const { data, loading, error, reload } = useFetch(() => api.get('/analytics', { range }).then((r) => r.data), [orgId, range]);

  const header = (
    <PageHeader title="Analytics" description="Calculated from your workspace’s tickets. Days are in UTC."
      actions={<select value={range} onChange={(e) => setRange(e.target.value)} aria-label="Date range" className="h-10 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold"><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option></select>} />
  );
  if (error && !data) return <>{header}<Card><ErrorState message={error} onRetry={reload} /></Card></>;
  if (!data) return <>{header}<div className="grid grid-cols-2 gap-4 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div><Skeleton className="mt-6 h-80" /></>;

  const d = data;
  if (d.totals.total === 0) return <>{header}<Card><EmptyState icon={BarChart3} title="No data to show yet" description="Charts appear once your workspace has tickets. Create a ticket from the inbox to get started." /></Card></>;

  const workloadMax = Math.max(...d.workload.map((w) => w.open), 1);
  const statusData = d.byStatus.map((s) => ({ ...s, label: statusLabel(s.name) })).filter((s) => s.value > 0);
  const priorityData = d.byPriority.map((p) => ({ ...p, label: priorityLabel(p.name) }));
  const tickEvery = d.volume.length > 30 ? 13 : d.volume.length > 7 ? 4 : 0;

  return (
    <>
      {header}
      <div className={loading ? 'opacity-70 transition-opacity' : ''}>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Kpi label="Total tickets" value={d.totals.total} hint={`${d.createdInRange} created in range`} />
          <Kpi label="Open" value={d.totals.open} hint="Not yet resolved" />
          <Kpi label="Resolved" value={d.totals.resolved} hint="All time" />
          <Kpi label="Urgent" value={d.totals.urgent} hint="Unresolved and urgent" />
        </div>
        <Card className="mt-4 flex flex-wrap items-baseline justify-between gap-2 p-5">
          <p className="text-sm font-semibold text-slate-500">Average resolution time</p>
          <p className="text-2xl font-extrabold tabular-nums text-slate-900">{formatHours(d.avgResolutionHours)}</p>
          <p className="w-full text-xs text-slate-500">{d.avgResolutionHours == null ? 'Not enough data: no tickets were resolved in this range.' : `Based on ${d.resolvedSampleSize} ticket${d.resolvedSampleSize > 1 ? 's' : ''} resolved in this range.`}</p>
        </Card>

        <Card className="mt-6">
          <CardHeader title="Ticket volume" description="Created and resolved per day" />
          <div className="h-72 p-4 pr-6" role="img" aria-label="Line chart of tickets created and resolved per day">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={d.volume} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#EEF1F6" vertical={false} />
                <XAxis dataKey="date" tickFormatter={shortDate} interval={tickEvery} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                <Tooltip {...tip} labelFormatter={shortDate} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="created" name="Created" stroke="#6A38F5" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="resolved" name="Resolved" stroke="#10B981" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="By status" description="Tickets created in this range" />
            {statusData.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No tickets were created in this range.</p> : (
              <div className="h-64 p-4" role="img" aria-label="Pie chart of tickets by status">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} dataKey="value" nameKey="label" innerRadius={55} outerRadius={85} paddingAngle={2}>{statusData.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}</Pie>
                    <Tooltip {...tip} /><Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="By priority" description="Tickets created in this range" />
            <div className="h-64 p-4 pr-6" role="img" aria-label="Bar chart of tickets by priority">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={priorityData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} tickLine={false} axisLine={false} />
                  <Tooltip {...tip} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="value" name="Tickets" radius={[6, 6, 0, 0]}>{priorityData.map((p) => <Cell key={p.name} fill={PRIORITY_COLORS[p.name]} />)}</Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader title="Agent workload" description="Unresolved tickets right now" />
            {d.workload.length === 0 ? <p className="p-8 text-center text-sm text-slate-500">No unresolved tickets.</p> : (
              <ul className="space-y-4 p-5">
                {d.workload.map((w) => (
                  <li key={w.id}>
                    <div className="mb-1.5 flex items-center justify-between text-sm"><span className="flex items-center gap-2 font-semibold text-slate-700"><Avatar name={w.name} size="sm" />{w.name}</span><span className="tabular-nums text-slate-500">{w.open}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${w.id === 'unassigned' ? 'bg-amber-400' : 'bg-brand-600'}`} style={{ width: `${(w.open / workloadMax) * 100}%` }} /></div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card>
            <CardHeader title="Recent activity" />
            <ul className="divide-y divide-slate-100">
              {d.recentActivity.length === 0 ? <li className="p-8 text-center text-sm text-slate-500">No activity recorded yet.</li> : d.recentActivity.map((r) => (
                <li key={r.id} className="flex gap-3 px-5 py-3"><Avatar name={r.actor} size="sm" /><div className="min-w-0"><p className="text-sm text-slate-700">{r.summary}</p><p className="text-xs text-slate-400">{timeAgo(r.createdAt)}</p></div></li>
              ))}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
