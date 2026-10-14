import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, ChevronDown, Pencil, Send, Sparkles, StickyNote, Trash2, UserPlus } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Avatar, Badge, Button, Card, ConfirmDialog, ErrorState, Notice, PriorityBadge, Select, Skeleton, StatusBadge, Textarea, cx } from '../components/ui.jsx';
import TicketFormModal from '../features/TicketForm.jsx';
import { PRIORITY_OPTIONS, STATUS_OPTIONS, errorCode, errorMessage, formatDateTime, idOf, timeAgo } from '../utils/format.js';

const COMPOSER_TABS = [
  { id: 'reply', label: 'Reply to customer', icon: Send },
  { id: 'note', label: 'Internal note', icon: StickyNote },
  { id: 'customer', label: 'Log customer message', icon: UserPlus },
];
const CONFIDENCE = {
  grounded: { tone: 'green', label: 'Grounded in your articles' },
  partial: { tone: 'amber', label: 'Partly covered' },
  insufficient: { tone: 'red', label: 'Not covered: consider escalating' },
  unknown: { tone: 'slate', label: 'Review carefully' },
};

function Bubble({ who, name, time, body, kind, aiAssisted }) {
  const mine = kind !== 'customer';
  return (
    <div className={cx('flex gap-3', mine && 'flex-row-reverse')}>
      <Avatar name={name} size="sm" className="mt-1" />
      <div className={cx('max-w-[85%] min-w-0', mine && 'text-right')}>
        <p className="mb-1 text-xs text-slate-500"><span className="font-bold text-slate-700">{name}</span>{who && <> · {who}</>} · {formatDateTime(time)}</p>
        <div className={cx('inline-block whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed',
          kind === 'customer' && 'rounded-tl-sm bg-slate-100 text-slate-800',
          kind === 'reply' && 'rounded-tr-sm bg-brand-600 text-white',
          kind === 'note' && 'rounded-tr-sm border border-amber-200 bg-amber-50 text-amber-950')}>{body}</div>
        {aiAssisted && <p className="mt-1 flex items-center justify-end gap-1 text-xs text-slate-400"><Sparkles className="h-3 w-3" aria-hidden />Drafted with AI, reviewed by an agent</p>}
      </div>
    </div>
  );
}

function AiAssistant({ ticketId, canUse, onUse }) {
  const { orgId } = useAuth();
  const status = useFetch(() => api.get('/ai/status').then((r) => r.data), [orgId]);
  const [state, setState] = useState({ loading: false, error: null, code: null, result: null });
  const [showSources, setShowSources] = useState(false);
  const [selected, setSelected] = useState([]);
  const articles = useFetch(() => (showSources ? api.get('/knowledge', { status: 'published', limit: 50 }).then((r) => r.data) : Promise.resolve(null)), [showSources, orgId]);

  if (!canUse) return null;
  const run = async () => {
    setState({ loading: true, error: null, code: null, result: null });
    try {
      const { data } = await api.post(`/tickets/${ticketId}/ai-reply`, selected.length ? { articleIds: selected } : {});
      setState({ loading: false, error: null, code: null, result: data });
      status.reload();
    } catch (e) {
      setState({ loading: false, error: errorMessage(e), code: errorCode(e), result: null });
    }
  };

  const notConfigured = (status.data && !status.data.configured) || state.code === 'AI_NOT_CONFIGURED';
  const r = state.result;
  const conf = r && (CONFIDENCE[r.confidence] || CONFIDENCE.unknown);

  return (
    <div className="rounded-xl border border-brand-200 bg-brand-50/50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-900"><Sparkles className="h-4 w-4" aria-hidden />AI reply assistant</p>
        {status.data?.configured && <span className="text-xs text-slate-500">{status.data.used} / {status.data.limit} used this month</span>}
      </div>

      {notConfigured ? (
        <div className="mt-3"><Notice tone="warn" title="AI replies aren’t set up">Add <code className="rounded bg-white/70 px-1 font-mono text-xs">AI_API_KEY</code> (and optionally <code className="rounded bg-white/70 px-1 font-mono text-xs">AI_MODEL</code>) to the server’s <code className="font-mono text-xs">.env</code> file, then restart the server. You can keep working on this ticket manually.</Notice></div>
      ) : (
        <>
          <p className="mt-1 text-sm text-slate-600">Drafts a reply from your published articles. You review and edit it before anything is sent.</p>
          <button onClick={() => setShowSources((s) => !s)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:underline" aria-expanded={showSources}>
            <BookOpen className="h-3.5 w-3.5" aria-hidden />{selected.length ? `${selected.length} source${selected.length > 1 ? 's' : ''} chosen` : 'Choose sources (optional)'}<ChevronDown className={cx('h-3.5 w-3.5 transition-transform', showSources && 'rotate-180')} aria-hidden />
          </button>
          {showSources && (
            <div className="mt-2 max-h-44 overflow-y-auto rounded-lg border border-slate-200 bg-white p-2 scroll-thin">
              {articles.loading && !articles.data ? <Skeleton className="h-8" /> : !articles.data?.data.length ? (
                <p className="p-2 text-xs text-slate-500">No published articles yet. Publish some in the knowledge base to ground the AI.</p>
              ) : (
                <>
                  <p className="px-2 pb-1 text-xs text-slate-500">Leave all unchecked to use the most relevant articles automatically (up to 3). Choose up to 5.</p>
                  {articles.data.data.map((a) => (
                    <label key={a.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-slate-50">
                      <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" checked={selected.includes(a.id)} disabled={!selected.includes(a.id) && selected.length >= 5}
                        onChange={(e) => setSelected((s) => (e.target.checked ? [...s, a.id] : s.filter((x) => x !== a.id)))} />
                      <span className="truncate">{a.title}</span>
                    </label>
                  ))}
                </>
              )}
            </div>
          )}
          <div className="mt-3"><Button size="sm" icon={Sparkles} loading={state.loading} onClick={run}>{r ? 'Regenerate draft' : 'Suggest a reply'}</Button></div>
          {state.loading && <p className="mt-2 text-xs text-slate-500" role="status">Reading the ticket and your articles. This can take a few seconds…</p>}
          {state.error && state.code !== 'AI_NOT_CONFIGURED' && (
            <div className="mt-3"><Notice tone="error" title={{ AI_RATE_LIMITED: 'The AI provider is busy', AI_TIMEOUT: 'The AI provider timed out', AI_LIMIT_REACHED: 'Monthly limit reached' }[state.code] || 'Couldn’t generate a draft'} action={state.code !== 'AI_LIMIT_REACHED' && <Button size="sm" variant="secondary" onClick={run}>Try again</Button>}>{state.error}</Notice></div>
          )}
          {r && (
            <div className="mt-4 space-y-3">
              <div className="flex flex-wrap items-center gap-2"><Badge tone={conf.tone}>{conf.label}</Badge><span className="text-xs text-slate-500">Model {r.model}</span></div>
              <div className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-white p-3.5 text-sm leading-relaxed text-slate-800">{r.suggestion}</div>
              {r.escalationNote && <Notice tone="warn" title="Note for you (not part of the draft)">{r.escalationNote}</Notice>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-600">Sources:</span>
                {r.sources.length ? r.sources.map((s) => <span key={s.id} className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200"><BookOpen className="h-3 w-3" aria-hidden />{s.title}</span>) : <span>No matching articles were found.</span>}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => { onUse(r.suggestion); setState((s) => ({ ...s, result: null })); }}>Use as draft</Button>
                <Button size="sm" variant="ghost" onClick={() => setState((s) => ({ ...s, result: null }))}>Discard</Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function TicketDetail() {
  const { ticketId } = useParams();
  const { orgId, can } = useAuth();
  const toast = useToast();
  const nav = useNavigate();
  const { data, loading, error, reload, setData } = useFetch(() => api.get(`/tickets/${ticketId}`).then((r) => r.data), [ticketId, orgId]);
  const members = useFetch(() => api.get('/org/members').then((r) => r.data), [orgId]);
  const org = useFetch(() => api.get('/org').then((r) => r.data), [orgId]);

  const [tab, setTab] = useState('reply');
  const [body, setBody] = useState('');
  const [aiAssisted, setAiAssisted] = useState(false);
  const [sending, setSending] = useState(false);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const composerRef = useRef(null);
  const endRef = useRef(null);
  useEffect(() => { endRef.current?.scrollIntoView({ block: 'nearest' }); }, [data?.messages.length]);

  if (error && !data) return <Card><ErrorState title="Ticket not found" message={error.includes('Ticket not found') ? 'This ticket doesn’t exist, or it belongs to a different workspace.' : error} onRetry={reload} /></Card>;
  if (loading && !data) return <div className="space-y-4"><Skeleton className="h-8 w-1/2" /><Skeleton className="h-96" /></div>;

  const { ticket, messages, customerHistory } = data;
  const writable = can('agent');
  const agents = (members.data || []).filter((m) => ['agent', 'admin', 'owner'].includes(m.role));

  const patch = async (change, okMsg) => {
    try {
      const { data: updated } = await api.patch(`/tickets/${ticket.id}`, change);
      setData((d) => ({ ...d, ticket: updated }));
      toast.success(okMsg);
    } catch (e) { toast.error(errorMessage(e)); reload(); }
  };

  const send = async () => {
    if (!body.trim()) return;
    setSending(true);
    try {
      const { data: msg } = await api.post(`/tickets/${ticket.id}/messages`, { type: tab, body, aiAssisted: tab === 'reply' && aiAssisted });
      setData((d) => ({ ...d, messages: [...d.messages, msg] }));
      setBody(''); setAiAssisted(false);
      toast.success({ reply: 'Reply sent.', note: 'Note added.', customer: 'Customer message logged.' }[tab]);
    } catch (e) { toast.error(errorMessage(e)); } finally { setSending(false); }
  };

  return (
    <>
      <Link to="/app/inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-slate-800"><ArrowLeft className="h-4 w-4" aria-hidden />Inbox</Link>
      <div className="grid gap-6 xl:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-500">Ticket #{ticket.number} · {ticket.category}</p>
                <h1 className="mt-1 break-words text-xl font-extrabold tracking-tight text-slate-900">{ticket.subject}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-2"><StatusBadge status={ticket.status} /><PriorityBadge priority={ticket.priority} /><span className="text-xs text-slate-500">Opened {timeAgo(ticket.createdAt)}</span></div>
              </div>
              <div className="flex gap-2">
                {writable && <Button size="sm" variant="secondary" icon={Pencil} onClick={() => setEditing(true)}>Edit</Button>}
                {can('admin') && <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(true)}>Delete</Button>}
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <div className="space-y-5">
              <Bubble kind="customer" name={ticket.customerName} who="Customer" time={ticket.createdAt} body={ticket.description} />
              {messages.map((m) => (
                <Bubble key={m.id} kind={m.type} name={m.type === 'customer' ? ticket.customerName : m.author?.name || 'Agent'} who={m.type === 'note' ? 'Internal note' : m.type === 'customer' ? 'Customer' : 'Reply'} time={m.createdAt} body={m.body} aiAssisted={m.aiAssisted} />
              ))}
              <div ref={endRef} />
            </div>
          </Card>

          {writable ? (
            <>
              {tab === 'reply' && <AiAssistant ticketId={ticket.id} canUse={writable} onUse={(text) => { setBody(text); setAiAssisted(true); setTimeout(() => composerRef.current?.focus(), 0); }} />}
              <Card>
                <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 scroll-thin" role="tablist">
                  {COMPOSER_TABS.map(({ id, label, icon: Icon }) => (
                    <button key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)} className={cx('flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold', tab === id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800')}><Icon className="h-4 w-4" aria-hidden />{label}</button>
                  ))}
                </div>
                <div className={cx('p-4', tab === 'note' && 'bg-amber-50/50')}>
                  {tab === 'note' && <p className="mb-2 text-xs font-semibold text-amber-800">Only your team can see internal notes.</p>}
                  {tab === 'customer' && <p className="mb-2 text-xs text-slate-500">Record something the customer sent you (for example from email or chat) so the history stays complete.</p>}
                  {tab === 'reply' && aiAssisted && <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-brand-700"><Sparkles className="h-3.5 w-3.5" aria-hidden />AI draft loaded. Edit as needed; it is only sent when you press Send reply.</p>}
                  <Textarea ref={composerRef} aria-label="Message" rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder={{ reply: `Write a reply to ${ticket.customerName.split(' ')[0]}…`, note: 'Add a note for your teammates…', customer: 'Paste or type the customer’s message…' }[tab]} maxLength={10000} />
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">{body.length.toLocaleString()} / 10,000</span>
                    <Button icon={Send} loading={sending} disabled={!body.trim()} onClick={send}>{{ reply: 'Send reply', note: 'Add note', customer: 'Log message' }[tab]}</Button>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Notice tone="info">You have view-only access. Ask an admin for the Agent role to reply or edit tickets.</Notice>
          )}
        </div>

        <aside className="space-y-4">
          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-bold text-slate-900">Details</h2>
            <Select label="Status" value={ticket.status} disabled={!writable} onChange={(e) => patch({ status: e.target.value }, 'Status updated.')}>{STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select label="Priority" value={ticket.priority} disabled={!writable} onChange={(e) => patch({ priority: e.target.value }, 'Priority updated.')}>{PRIORITY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select>
            <Select label="Assignee" value={idOf(ticket.assignee) || ''} disabled={!writable} onChange={(e) => patch({ assignee: e.target.value || null }, e.target.value ? 'Ticket assigned.' : 'Ticket unassigned.')}>
              <option value="">Unassigned</option>
              {agents.map((m) => <option key={m.user.id} value={m.user.id}>{m.user.name}</option>)}
            </Select>
            <Select label="Category" value={ticket.category} disabled={!writable} onChange={(e) => patch({ category: e.target.value }, 'Category updated.')}>
              {[...new Set([...(org.data?.organization.settings.categories || []), ticket.category])].map((c) => <option key={c}>{c}</option>)}
            </Select>
            {ticket.resolvedAt && <p className="text-xs text-slate-500">Resolved {formatDateTime(ticket.resolvedAt)}</p>}
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-bold text-slate-900">Customer</h2>
            <div className="mt-3 flex items-center gap-3"><Avatar name={ticket.customerName} size="lg" /><div className="min-w-0"><p className="truncate text-sm font-bold text-slate-900">{ticket.customerName}</p><a href={`mailto:${ticket.customerEmail}`} className="block truncate text-xs text-brand-700 hover:underline">{ticket.customerEmail}</a></div></div>
            <h3 className="mb-2 mt-5 text-xs font-bold text-slate-500">Previous tickets</h3>
            {customerHistory.length === 0 ? <p className="text-sm text-slate-500">No other tickets from this customer.</p> : (
              <ul className="space-y-2">{customerHistory.map((h) => (
                <li key={h.id}><Link to={`/app/tickets/${h.id}`} className="block rounded-lg p-2 hover:bg-slate-50"><p className="truncate text-sm font-semibold text-slate-800">#{h.number} {h.subject}</p><p className="mt-1"><StatusBadge status={h.status} /></p></Link></li>
              ))}</ul>
            )}
          </Card>
        </aside>
      </div>

      <TicketFormModal open={editing} onClose={() => setEditing(false)} ticket={ticket} onSaved={(t) => { setData((d) => ({ ...d, ticket: t })); toast.success('Ticket updated.'); }} />
      <ConfirmDialog open={deleting} onClose={() => setDeleting(false)} danger title="Delete this ticket?" message={`Ticket #${ticket.number} and its entire conversation will be permanently deleted. This can’t be undone.`} confirmLabel="Delete ticket"
        onConfirm={async () => { try { await api.del(`/tickets/${ticket.id}`); toast.success('Ticket deleted.'); nav('/app/inbox'); } catch (e) { toast.error(errorMessage(e)); throw e; } }} />
    </>
  );
}
