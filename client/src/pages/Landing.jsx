import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, Bell, BookOpen, Building2, History, Inbox, Plus, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { Button } from '../components/ui.jsx';
import ProductPreview from '../features/ProductPreview.jsx';
import PricingCards from '../features/PricingCards.jsx';

const steps = [
  ['Create your workspace', 'Sign up, name your workspace and invite the people who answer customers.'],
  ['Teach it your policies', 'Write or paste the articles your team already relies on: refunds, setup guides, account rules. Publish the ones the assistant may use.'],
  ['Work the inbox together', 'Tickets are prioritized, assigned and tracked through open, in progress, waiting and resolved, with internal notes beside the conversation.'],
  ['Review the draft, then send', 'The assistant drafts a reply from your published articles. An agent edits it and decides whether it goes out.'],
];

const faqs = [
  ['Does the AI ever reply to customers on its own?', 'No. It only produces a draft inside the ticket. Nothing reaches a customer until an agent reviews, edits and sends it.'],
  ['What stops it from making up policies?', 'The assistant is instructed to use only your published knowledge base articles. When they do not cover the question, the draft says so, flags low confidence and suggests escalating instead of guessing. You still review every draft.'],
  ['Is our data separated from other companies?', 'Yes. Every workspace is isolated, and the server checks your membership and role on every request. Tickets, articles and members from one workspace are never reachable from another.'],
  ['What happens if we have not set up an AI provider?', 'The rest of ResolveAI works normally. The AI panel shows a short setup message explaining which key to add.'],
  ['How does billing work?', 'Start on the Free plan. Paid plans raise the member and AI-assisted reply limits. This deployment does not process payments yet, so plan changes are for evaluation only.'],
  ['Can customers browse our answers themselves?', 'Yes. Published articles appear in a public help center for your workspace. Drafts are never shown.'],
];

const more = [
  [Users, 'Roles that are enforced', 'Owner, admin, agent and viewer permissions are checked on the server.'],
  [Building2, 'Separate workspaces', 'Belong to several organizations and switch between them.'],
  [Bell, 'In-app notifications', 'Hear about assignments, notes and new teammates.'],
  [History, 'Activity history', 'See who changed what, and when.'],
  [BookOpen, 'Public help center', 'Share published articles with customers.'],
  [ShieldCheck, 'Plan limits', 'Members and AI replies are counted and capped per plan.'],
];

function FeatureRow({ icon: Icon, title, body, bullets, children, flip }) {
  return (
    <div className={`grid items-center gap-10 lg:grid-cols-2 lg:gap-16 ${flip ? 'lg:[&>*:first-child]:order-2' : ''}`}>
      <div>
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Icon className="h-5 w-5" aria-hidden /></span>
        <h3 className="mt-5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">{title}</h3>
        <p className="mt-3 max-w-lg leading-relaxed text-slate-600">{body}</p>
        <ul className="mt-5 space-y-2 text-sm font-medium text-slate-700">{bullets.map((b) => <li key={b} className="flex gap-2.5"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" aria-hidden />{b}</li>)}</ul>
      </div>
      <div>{children}</div>
    </div>
  );
}

export default function Landing() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-brand-50/70 via-white to-white">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-14 sm:px-6 lg:pt-20">
          <div className="max-w-3xl">
            <h1 className="text-5xl font-extrabold leading-[1.05] tracking-tight text-slate-900 sm:text-6xl">Support that resolves itself.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-slate-600">Bring your support tickets, team workflows, and AI-powered knowledge into one intelligent workspace.</p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/register"><Button size="lg" icon={ArrowRight}>Start free</Button></Link>
              <a href="#how-it-works"><Button size="lg" variant="secondary">See how it works</Button></a>
            </div>
            <p className="mt-4 text-sm text-slate-500">The Free plan includes 3 team members and 25 AI-assisted replies a month.</p>
          </div>
          <div className="mt-14"><ProductPreview /></div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl space-y-24 px-4 sm:px-6">
          <FeatureRow icon={Inbox} title="One inbox your whole team can work from" body="Every ticket has an owner, a status and a priority. Search, filter and sort to find what needs attention, and keep internal notes right beside the customer conversation." bullets={['Filter tabs for mine, unassigned and each status', 'Customer history on every ticket', 'Assign and reassign without leaving the page']}>
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card">
              {[['Charged twice this month', 'Billing', 'urgent'], ['Webhook not firing', 'Technical', 'high'], ['Add more seats to our plan', 'Billing', 'medium']].map(([s, c, p], i) => (
                <div key={s} className={`flex items-center gap-3 px-4 py-3.5 ${i ? 'border-t border-slate-100' : ''}`}>
                  <span className={`h-2.5 w-2.5 rounded-full ${{ urgent: 'bg-red-500', high: 'bg-orange-500', medium: 'bg-sky-500' }[p]}`} aria-hidden />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{s}</p><p className="text-xs text-slate-500">{c}</p></div>
                  <span className="text-xs font-semibold capitalize text-slate-500">{p}</span>
                </div>
              ))}
            </div>
          </FeatureRow>

          <FeatureRow flip icon={Sparkles} title="Drafts built from your knowledge, not guesses" body="When an agent opens a ticket, ResolveAI finds the relevant published articles and asks your AI provider for a draft that stays inside them. If your articles do not cover the question, the draft says so and recommends escalation." bullets={['Choose the exact articles to draw from, or let it pick', 'Confidence label and an internal escalation note', 'Agents always review and edit before anything is sent']}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card">
              <div className="flex items-center justify-between"><p className="text-sm font-bold text-slate-900">Draft for ticket #1043</p><span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200">Low confidence</span></div>
              <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">Thanks for your patience. I’m confirming the details with our team and will get back to you as soon as I have a definite answer.</p>
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900"><strong>Internal note:</strong> No published article covers custom data residency. Ask the security team before promising anything.</p>
            </div>
          </FeatureRow>

          <FeatureRow icon={BarChart3} title="Analytics from your real tickets" body="See volume, status and priority mix, agent workload and average resolution time, all calculated from your workspace’s records. Quiet weeks look quiet. Nothing is padded." bullets={['Created versus resolved over 7, 30 or 90 days', 'Workload by agent, including unassigned', 'Recent activity from the audit history']}>
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-card" role="img" aria-label="Illustration of a bar chart">
              <div className="flex h-40 items-end gap-2">{[40, 62, 35, 78, 55, 90, 48, 70, 30, 64, 82, 44].map((h, i) => <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-brand-600 to-brand-300" style={{ height: `${h}%`, opacity: 0.55 + (i % 4) * 0.12 }} />)}</div>
              <p className="mt-3 text-xs text-slate-400">Illustration</p>
            </div>
          </FeatureRow>

          <div>
            <h3 className="text-xl font-extrabold text-slate-900">And the rest of what a support team needs</h3>
            <div className="mt-6 grid gap-x-10 gap-y-7 sm:grid-cols-2 lg:grid-cols-3">
              {more.map(([Icon, t, d]) => (
                <div key={t} className="flex gap-3.5"><Icon className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden /><div><p className="text-sm font-bold text-slate-900">{t}</p><p className="mt-0.5 text-sm text-slate-600">{d}</p></div></div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-20 bg-navy-900 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 className="max-w-xl text-3xl font-extrabold tracking-tight sm:text-4xl">From sign-up to first reply in an afternoon</h2>
          <ol className="mt-12 grid gap-px overflow-hidden rounded-2xl bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map(([t, d], i) => (
              <li key={t} className="bg-navy-900 p-6">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-500 text-sm font-extrabold">{i + 1}</span>
                <h3 className="mt-4 text-base font-bold">{t}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">Pricing that grows with your team</h2>
            <p className="mt-3 text-slate-600">Start free. Move up when you need more seats or more AI-assisted replies.</p>
          </div>
          <PricingCards />
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="scroll-mt-20 border-t border-slate-100 bg-surface py-20 sm:py-24">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">Frequently asked questions</h2>
          <div className="mt-8 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white shadow-card">
            {faqs.map(([q, a]) => (
              <details key={q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  {q}<Plus className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-45" aria-hidden />
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-4xl rounded-3xl bg-navy-900 px-6 py-14 text-center text-white sm:px-12">
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Give your team one place to resolve things</h2>
          <p className="mx-auto mt-3 max-w-xl text-slate-300">Create a workspace in a minute. Add your first articles, invite a teammate, and answer your first ticket.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/register"><Button size="lg" className="bg-brand-500 hover:bg-brand-400">Create your workspace</Button></Link>
            <Link to="/login"><Button size="lg" variant="secondary" className="border-white/20 bg-white/10 text-white hover:bg-white/20">Log in</Button></Link>
          </div>
        </div>
      </section>
    </>
  );
}
