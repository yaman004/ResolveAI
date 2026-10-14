import { useState } from 'react';
import { Check } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Meter, Notice, PageHeader, Skeleton, cx } from '../components/ui.jsx';
import { errorMessage } from '../utils/format.js';

export default function Billing() {
  const { orgId, role } = useAuth();
  const toast = useToast();
  const { data, error, reload } = useFetch(() => api.get('/org/billing').then((r) => r.data), [orgId]);
  const [target, setTarget] = useState(null);

  if (error && !data) return <><PageHeader title="Billing" /><Card><ErrorState message={error} onRetry={reload} /></Card></>;
  if (!data) return <><PageHeader title="Billing" /><Skeleton className="h-64" /></>;

  const isOwner = role === 'owner';
  const order = ['free', 'pro', 'business'];
  return (
    <>
      <PageHeader title="Billing" description="Your plan, usage and limits." />
      <div className="space-y-6">
        <Notice tone="warn" title="Payments aren’t connected">No payment provider is configured, so no card is charged and there are no invoices. {data.planSwitchEnabled ? 'Plan changes are available for evaluation only.' : 'Plan changes are disabled until payments are enabled.'}</Notice>
        <div className="grid gap-6 lg:grid-cols-[1fr_1.3fr]">
          <Card>
            <CardHeader title="Current plan" action={<Badge tone="violet">{data.plan.name}</Badge>} />
            <div className="space-y-5 p-5">
              <p className="text-3xl font-extrabold tracking-tight text-slate-900">${data.plan.priceMonthly}<span className="text-sm font-medium text-slate-500"> / month</span></p>
              <Meter label="Team members" used={data.usage.members} limit={data.limits.members} />
              <Meter label="AI-assisted replies this month" used={data.usage.aiReplies} limit={data.limits.aiRepliesPerMonth} />
              <p className="text-xs text-slate-500">Usage period {data.usage.period} (UTC). AI reply counts reset at the start of each month. Failed generations are not counted.</p>
            </div>
          </Card>
          <Card>
            <CardHeader title="Plans" description={isOwner ? 'Only the workspace owner can change the plan.' : 'Ask the workspace owner to change the plan.'} />
            <ul className="divide-y divide-slate-100">
              {order.map((id) => data.plans.find((p) => p.id === id)).map((p) => {
                const current = p.id === data.plan.id;
                return (
                  <li key={p.id} className={cx('flex flex-wrap items-center gap-4 px-5 py-4', current && 'bg-brand-50/50')}>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 font-bold text-slate-900">{p.name}<span className="text-sm font-medium text-slate-500">${p.priceMonthly}/mo</span></p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500"><Check className="h-3.5 w-3.5 text-brand-600" aria-hidden />{p.limits.members} members · {p.limits.aiRepliesPerMonth.toLocaleString()} AI replies/month</p>
                    </div>
                    {current ? <Badge tone="violet">Current</Badge> : <Button size="sm" variant="secondary" disabled={!isOwner || !data.planSwitchEnabled} onClick={() => setTarget(p)}>Switch to {p.name}</Button>}
                  </li>
                );
              })}
            </ul>
          </Card>
        </div>
      </div>
      <ConfirmDialog open={Boolean(target)} onClose={() => setTarget(null)} title={`Switch to ${target?.name}?`} confirmLabel="Switch plan"
        message={`Your limits change immediately. No payment is taken because billing isn’t connected.`}
        onConfirm={async () => { try { await api.patch('/org/billing/plan', { plan: target.id }); toast.success(`Switched to ${target.name}.`); reload(); } catch (e) { toast.error(errorMessage(e)); throw e; } }} />
    </>
  );
}
