import { forwardRef, useEffect, useId, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { priorityLabel, statusLabel } from '../utils/format.js';

export const cx = (...a) => a.filter(Boolean).join(' ');

/* ---------- Buttons ---------- */
const variants = {
  primary: 'bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800',
  secondary: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  ghost: 'text-slate-600 hover:bg-slate-100',
  danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
  dark: 'bg-navy-900 text-white hover:bg-navy-700',
};
const sizes = { sm: 'h-8 px-3 text-[13px]', md: 'h-10 px-4 text-sm', lg: 'h-12 px-6 text-base' };

export function Button({ variant = 'primary', size = 'md', loading = false, icon: Icon, children, className, disabled, type = 'button', ...rest }) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cx('inline-flex shrink-0 items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50', sizes[size], variants[variant], className)}
      {...rest}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : Icon ? <Icon className="h-4 w-4" aria-hidden /> : null}
      {children}
    </button>
  );
}

/* ---------- Form fields ---------- */
const inputBase = 'block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500';

const Field = forwardRef(function Field({ as: As = 'input', label, error, hint, className, inputClassName, children, ...rest }, ref) {
  const id = useId();
  return (
    <div className={className}>
      {label && <label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>}
      <As
        id={id}
        ref={ref}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : undefined}
        className={cx(inputBase, As === 'textarea' ? 'py-2.5' : 'h-10', error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-300', inputClassName)}
        {...rest}
      >
        {children}
      </As>
      {hint && !error && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {error && <p id={`${id}-err`} role="alert" className="mt-1 text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
});
export const Input = forwardRef((props, ref) => <Field ref={ref} as="input" {...props} />);
export const Select = forwardRef((props, ref) => <Field ref={ref} as="select" {...props} />);
export const Textarea = forwardRef((props, ref) => <Field ref={ref} as="textarea" {...props} />);

/* ---------- Badges ---------- */
const tones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  violet: 'bg-brand-50 text-brand-700 ring-brand-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  orange: 'bg-orange-50 text-orange-700 ring-orange-200',
};
export function Badge({ tone = 'slate', children, className }) {
  return <span className={cx('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>{children}</span>;
}
const statusTone = { open: 'blue', in_progress: 'violet', waiting: 'amber', resolved: 'green' };
const priorityTone = { low: 'slate', medium: 'blue', high: 'orange', urgent: 'red' };
const priorityDot = { low: 'bg-slate-400', medium: 'bg-sky-500', high: 'bg-orange-500', urgent: 'bg-red-500' };
export const StatusBadge = ({ status }) => <Badge tone={statusTone[status]}>{statusLabel(status)}</Badge>;
export const PriorityBadge = ({ priority }) => (
  <Badge tone={priorityTone[priority]}><span className={cx('h-1.5 w-1.5 rounded-full', priorityDot[priority])} aria-hidden />{priorityLabel(priority)}</Badge>
);

/* ---------- Surfaces ---------- */
export const Card = ({ className, children, ...rest }) => <div className={cx('rounded-xl border border-slate-200 bg-white shadow-card', className)} {...rest}>{children}</div>;
export function CardHeader({ title, description, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[15px] font-bold text-slate-900">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {action}
    </div>
  );
}
export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ---------- Feedback states ---------- */
export const Skeleton = ({ className }) => <div className={cx('skeleton', className)} aria-hidden />;
export function SkeletonRows({ rows = 5 }) {
  return (
    <div className="divide-y divide-slate-100" role="status" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-5 py-4">
          <Skeleton className="h-3 w-3 rounded-full" />
          <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/5" /><Skeleton className="h-3 w-1/4" /></div>
          <Skeleton className="hidden h-5 w-16 sm:block" />
        </div>
      ))}
    </div>
  );
}
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      {Icon && <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><Icon className="h-6 w-6" aria-hidden /></div>}
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
export function ErrorState({ message, onRetry, title = 'Could not load this' }) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center" role="alert">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-6 w-6" aria-hidden /></div>
      <h3 className="text-base font-bold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      {onRetry && <Button className="mt-5" variant="secondary" onClick={onRetry}>Try again</Button>}
    </div>
  );
}
export function Notice({ tone = 'info', title, children, action }) {
  const t = { info: 'border-brand-200 bg-brand-50 text-brand-900', warn: 'border-amber-200 bg-amber-50 text-amber-900', error: 'border-red-200 bg-red-50 text-red-900' }[tone];
  return (
    <div className={cx('flex flex-wrap items-start justify-between gap-3 rounded-xl border p-4 text-sm', t)} role={tone === 'error' ? 'alert' : 'note'}>
      <div className="min-w-0 flex-1">{title && <p className="font-bold">{title}</p>}<div className={title ? 'mt-1 opacity-90' : ''}>{children}</div></div>
      {action}
    </div>
  );
}
export const Spinner = ({ className }) => <Loader2 className={cx('h-5 w-5 animate-spin text-brand-600', className)} aria-label="Loading" />;
export function FullPageSpinner() {
  return <div className="flex min-h-screen items-center justify-center bg-surface"><Spinner className="h-8 w-8" /></div>;
}

/* ---------- Avatar ---------- */
const avatarColors = ['bg-brand-600', 'bg-indigo-600', 'bg-sky-600', 'bg-emerald-600', 'bg-rose-600', 'bg-amber-600', 'bg-fuchsia-600'];
export function Avatar({ name = '?', size = 'md', className }) {
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?';
  const color = avatarColors[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % avatarColors.length];
  const s = { sm: 'h-6 w-6 text-[10px]', md: 'h-8 w-8 text-xs', lg: 'h-10 w-10 text-sm' }[size];
  return <span title={name} className={cx('inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white', s, color, className)} aria-hidden>{initials}</span>;
}

/* ---------- Dialogs ---------- */
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);
  if (!open) return null;
  const width = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="absolute inset-0 animate-fadeIn bg-navy-950/60 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('relative flex max-h-[92vh] w-full animate-popIn flex-col rounded-t-2xl bg-white shadow-pop sm:rounded-2xl', width)}>
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Close dialog"><X className="h-5 w-5" /></button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
        {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-3.5 sm:rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger = false }) {
  const [busy, setBusy] = useState(false);
  const run = async () => {
    setBusy(true);
    try { await onConfirm(); onClose(); } catch { /* caller shows the error */ } finally { setBusy(false); }
  };
  return (
    <Modal
      open={open}
      onClose={busy ? () => {} : onClose}
      title={title}
      size="sm"
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={run}>{confirmLabel}</Button></>}
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}

/* ---------- Misc ---------- */
export function Meter({ label, used, limit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const color = pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-brand-600';
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between text-sm"><span className="font-semibold text-slate-700">{label}</span><span className="tabular-nums text-slate-500">{used} / {limit}</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={used} aria-valuemin={0} aria-valuemax={limit} aria-label={label}><div className={cx('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} /></div>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
      <span>Page {meta.page} of {meta.pages} · {meta.total} total</span>
      <div className="flex gap-2">
        <Button size="sm" variant="secondary" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)}>Previous</Button>
        <Button size="sm" variant="secondary" disabled={meta.page >= meta.pages} onClick={() => onPage(meta.page + 1)}>Next</Button>
      </div>
    </div>
  );
}

export function Logo({ light = false, className }) {
  return (
    <span className={cx('inline-flex items-center gap-2.5 text-[17px] font-extrabold tracking-tight', light ? 'text-white' : 'text-slate-900', className)}>
      <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden><rect width="32" height="32" rx="8" fill="#6A38F5" /><path d="M9 16.5l4.5 4.5L23 11" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
      ResolveAI
    </span>
  );
}
