import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Logo } from '../components/ui.jsx';

const links = [
  { to: '/#features', label: 'Product' },
  { to: '/#how-it-works', label: 'How it works' },
  { to: '/pricing', label: 'Pricing' },
  { to: '/help', label: 'Help center' },
];

export function PublicHeader() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link to="/" aria-label="ResolveAI home"><Logo /></Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {links.map((l) => <NavLink key={l.to} to={l.to} className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900">{l.label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          {user ? <Link to="/app"><Button>Open workspace</Button></Link> : (<><Link to="/login"><Button variant="ghost">Log in</Button></Link><Link to="/register"><Button>Get started free</Button></Link></>)}
        </div>
        <button className="rounded-lg p-2 text-slate-700 hover:bg-slate-100 md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && (
        <div className="animate-fadeIn border-t border-slate-100 bg-white px-4 pb-4 pt-2 md:hidden">
          {links.map((l) => <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">{l.label}</Link>)}
          <div className="mt-3 flex gap-2">
            {user ? <Link to="/app" className="flex-1"><Button className="w-full">Open workspace</Button></Link> : (<><Link to="/login" className="flex-1"><Button variant="secondary" className="w-full">Log in</Button></Link><Link to="/register" className="flex-1"><Button className="w-full">Get started</Button></Link></>)}
          </div>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="bg-navy-950 text-slate-400">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <Logo light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed">Support tickets, team workflows and AI-assisted replies grounded in your own knowledge base.</p>
        </div>
        <FooterCol title="Product" items={[['Features', '/#features'], ['How it works', '/#how-it-works'], ['Pricing', '/pricing']]} />
        <FooterCol title="Resources" items={[['Help center', '/help'], ['Frequently asked questions', '/#faq']]} />
        <FooterCol title="Account" items={[['Log in', '/login'], ['Create account', '/register']]} />
      </div>
      <div className="border-t border-white/10 py-5 text-center text-xs">© {new Date().getFullYear()} ResolveAI. All rights reserved.</div>
    </footer>
  );
}
function FooterCol({ title, items }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-white">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm">{items.map(([l, to]) => <li key={l}><Link to={to} className="hover:text-white">{l}</Link></li>)}</ul>
    </div>
  );
}

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <PublicHeader />
      <main className="flex-1"><Outlet /></main>
      <PublicFooter />
    </div>
  );
}
