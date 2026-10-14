import { BookOpen, Sparkles } from 'lucide-react';
import { Avatar, Badge, PriorityBadge, StatusBadge, cx } from '../components/ui.jsx';

const rows = [
  { n: 1042, subject: 'Refund for last month', who: 'Hannah Brooks', priority: 'high', status: 'open', active: true },
  { n: 1041, subject: 'Dashboard will not load in Safari', who: 'Omar Haddad', priority: 'medium', status: 'in_progress' },
  { n: 1040, subject: 'Need SSO for our team', who: 'Lena Fischer', priority: 'low', status: 'waiting' },
  { n: 1039, subject: 'API returns 429 errors', who: 'Ravi Patel', priority: 'urgent', status: 'in_progress' },
];

/** Built from the real UI components. Content is a labeled sample, not live data. */
export default function ProductPreview() {
  return (
    <div className="relative">
      <div className="overflow-hidden rounded-2xl border border-white/10 bg-navy-900 shadow-hero">
        <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-3" aria-hidden>
          <span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" /><span className="h-2.5 w-2.5 rounded-full bg-white/20" />
          <span className="ml-3 text-xs font-semibold text-slate-400">Sample workspace · Inbox</span>
        </div>
        <div className="grid md:grid-cols-[17rem_1fr]">
          <div className="hidden border-r border-white/10 md:block">
            {rows.map((r) => (
              <div key={r.n} className={cx('border-b border-white/5 px-4 py-3', r.active && 'bg-brand-500/15')}>
                <p className="truncate text-[13px] font-bold text-white">{r.subject}</p>
                <p className="mt-0.5 text-xs text-slate-400">#{r.n} · {r.who}</p>
                <div className="mt-2 flex gap-1.5"><PriorityBadge priority={r.priority} /><StatusBadge status={r.status} /></div>
              </div>
            ))}
          </div>
          <div className="space-y-4 bg-white p-5">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-extrabold text-slate-900">Refund for last month</h3><PriorityBadge priority="high" /></div>
              <p className="mt-0.5 text-xs text-slate-500">#1042 · Hannah Brooks · Billing</p>
            </div>
            <div className="flex gap-3">
              <Avatar name="Hannah Brooks" size="sm" />
              <div className="rounded-xl rounded-tl-sm bg-slate-100 px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-700">Hi, I was charged on the 3rd but never really used the product. Can I get a refund?</div>
            </div>
            <div className="rounded-xl border border-brand-200 bg-brand-50/60 p-3.5">
              <div className="flex items-center justify-between gap-2">
                <p className="flex items-center gap-1.5 text-xs font-bold text-brand-800"><Sparkles className="h-3.5 w-3.5" aria-hidden />AI draft · review before sending</p>
                <Badge tone="green">Grounded</Badge>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-700">Hi Hannah, thanks for getting in touch. Monthly plans can be refunded within 14 days of the first payment, provided the plan allowance is mostly unused. I’ve passed your request to our billing team, who approve refunds, and we’ll follow up with you soon.</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200"><BookOpen className="h-3 w-3" aria-hidden />Refund policy</span>
                <span className="text-xs text-slate-500">Edit freely. Nothing is sent until you approve.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-3 text-center text-xs text-slate-400">Sample ticket shown for illustration.</p>
    </div>
  );
}
