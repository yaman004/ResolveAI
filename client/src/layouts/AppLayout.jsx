import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, Bell, BookOpen, Check, ChevronsUpDown, CreditCard, ExternalLink, Inbox, LayoutDashboard, LogOut, Menu, Plus, Settings, Users, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { api } from '../services/api.js';
import { useFetch } from '../hooks/useFetch.js';
import { Avatar, Logo, cx } from '../components/ui.jsx';
import { roleLabel, timeAgo } from '../utils/format.js';

const NAV = [
  { to: '/app', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/app/inbox', label: 'Inbox', icon: Inbox, badge: true },
  { to: '/app/knowledge', label: 'Knowledge base', icon: BookOpen },
  { to: '/app/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/app/team', label: 'Team', icon: Users },
  { to: '/app/billing', label: 'Billing', icon: CreditCard },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function useClickAway(ref, handler, active) {
  useEffect(() => {
    if (!active) return undefined;
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) handler(); };
    const onKey = (e) => e.key === 'Escape' && handler();
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [ref, handler, active]);
}

function OrgSwitcher({ onNavigate }) {
  const { memberships, organization, role, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const nav = useNavigate();
  const close = useCallback(() => setOpen(false), []);
  useClickAway(ref, close, open);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-left transition-colors hover:bg-white/10" aria-haspopup="listbox" aria-expanded={open}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-sm font-extrabold text-white">{organization?.name?.[0]?.toUpperCase()}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-bold text-white">{organization?.name}</span>
          <span className="block text-xs text-slate-400">{role && roleLabel(role)}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-slate-400" aria-hidden />
      </button>
      {open && (
        <div role="listbox" className="absolute left-0 right-0 top-full z-30 mt-2 animate-popIn overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
          {memberships.map((m) => (
            <button key={m.id} role="option" aria-selected={m.organization.id === organization?.id} onClick={() => { switchOrg(m.organization.id); setOpen(false); nav('/app'); onNavigate?.(); }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{m.organization.name}<span className="ml-2 text-xs font-medium text-slate-400">{roleLabel(m.role)}</span></span>
              {m.organization.id === organization?.id && <Check className="h-4 w-4 text-brand-600" aria-hidden />}
            </button>
          ))}
          <div className="my-1 border-t border-slate-100" />
          <Link to="/onboarding" onClick={() => { setOpen(false); onNavigate?.(); }} className="flex items-center gap-2 px-3 py-2 text-sm font-semibold text-brand-700 hover:bg-slate-50"><Plus className="h-4 w-4" aria-hidden />Create or switch workspace</Link>
        </div>
      )}
    </div>
  );
}

function Sidebar({ onNavigate }) {
  const { orgId, organization } = useAuth();
  const stats = useFetch(() => api.get('/tickets/stats').then((r) => r.data), [orgId]);
  const count = stats.data?.unresolved;
  return (
    <div className="flex h-full flex-col bg-navy-900 px-3 py-4">
      <div className="px-2 pb-4 pt-1"><Link to="/app" onClick={onNavigate}><Logo light /></Link></div>
      <OrgSwitcher onNavigate={onNavigate} />
      <nav className="mt-6 flex-1 space-y-0.5" aria-label="Main">
        {NAV.map(({ to, label, icon: Icon, end, badge }) => (
          <NavLink key={to} to={to} end={end} onClick={onNavigate} className={({ isActive }) => cx('group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-brand-500/20 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white')}>
            {({ isActive }) => (
              <>
                <Icon className={cx('h-[18px] w-[18px]', isActive ? 'text-brand-300' : 'text-slate-500 group-hover:text-slate-300')} aria-hidden />
                <span className="flex-1">{label}</span>
                {badge && count > 0 && <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs font-bold tabular-nums text-slate-200">{count}</span>}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      {organization?.slug && (
        <a href={`/help/${organization.slug}`} target="_blank" rel="noreferrer" className="mt-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-slate-400 hover:bg-white/5 hover:text-white">
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />Public help center
        </a>
      )}
    </div>
  );
}

function Notifications() {
  const { orgId } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickAway(ref, close, open);
  const { data, reload } = useFetch(() => api.get('/notifications'), [orgId]);
  useEffect(() => {
    const t = setInterval(reload, 60000);
    return () => clearInterval(t);
  }, [reload]);
  const unread = data?.meta?.unread || 0;
  const items = data?.data || [];
  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt) api.patch(`/notifications/${n.id}/read`).then(reload).catch(() => {});
    if (n.link) nav(n.link);
  };
  const readAll = async () => { await api.post('/notifications/read-all').catch(() => {}); reload(); };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => { setOpen((o) => !o); if (!open) reload(); }} className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700" aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`} aria-expanded={open}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[10px] font-bold text-white">{unread > 9 ? '9+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-2rem))] animate-popIn overflow-hidden rounded-xl border border-slate-200 bg-white shadow-pop">
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-bold text-slate-900">Notifications</h2>
            {unread > 0 && <button onClick={readAll} className="text-xs font-semibold text-brand-700 hover:underline">Mark all read</button>}
          </div>
          <div className="max-h-96 overflow-y-auto scroll-thin">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-500">You’re all caught up. Assignments and team activity show up here.</p>
            ) : items.map((n) => (
              <button key={n.id} onClick={() => openItem(n)} className={cx('flex w-full gap-3 border-b border-slate-50 px-4 py-3 text-left hover:bg-slate-50', !n.readAt && 'bg-brand-50/50')}>
                <span className={cx('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.readAt ? 'bg-transparent' : 'bg-brand-600')} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-800">{n.title}</span>
                  {n.body && <span className="mt-0.5 block truncate text-xs text-slate-500">{n.body}</span>}
                  <span className="mt-0.5 block text-xs text-slate-400">{timeAgo(n.createdAt)}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = useCallback(() => setOpen(false), []);
  useClickAway(ref, close, open);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 rounded-lg p-1 hover:bg-slate-100" aria-label="Account menu" aria-expanded={open}>
        <Avatar name={user.name} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-30 mt-2 w-60 animate-popIn overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-pop">
          <div className="border-b border-slate-100 px-4 py-3"><p className="truncate text-sm font-bold text-slate-900">{user.name}</p><p className="truncate text-xs text-slate-500">{user.email}</p></div>
          <button onClick={() => { setOpen(false); nav('/app/settings'); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><Settings className="h-4 w-4" aria-hidden />Profile and settings</button>
          <button onClick={async () => { await logout(); nav('/login'); }} className="flex w-full items-center gap-2 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
      )}
    </div>
  );
}

export default function AppLayout() {
  const { orgId } = useAuth();
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 lg:block"><Sidebar /></aside>
      {drawer && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 animate-fadeIn bg-navy-950/60" onClick={() => setDrawer(false)} aria-hidden />
          <div className="relative h-full w-72 max-w-[85vw] animate-fadeIn shadow-pop">
            <button onClick={() => setDrawer(false)} className="absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white" aria-label="Close menu"><X className="h-5 w-5" /></button>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setDrawer(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-1"><Notifications /><UserMenu /></div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
          <div key={orgId}><Outlet /></div>
        </main>
      </div>
    </div>
  );
}
