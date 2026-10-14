import { useState } from 'react';
import { Check, Copy, MailPlus, Trash2, Users } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Avatar, Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, Input, Meter, Modal, Notice, PageHeader, Select, SkeletonRows } from '../components/ui.jsx';
import { errorMessage, formatDate, roleLabel, timeAgo } from '../utils/format.js';

const ROLE_HELP = {
  admin: 'Manage the team, settings and knowledge base',
  agent: 'Work tickets, reply to customers, edit articles',
  viewer: 'Read-only access',
};

function InviteModal({ open, onClose, onCreated, isOwner }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('agent');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const close = () => { setEmail(''); setRole('agent'); setError(''); setResult(null); setCopied(false); onClose(); };
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try { const { data } = await api.post('/org/invitations', { email, role }); setResult(data); onCreated(); }
    catch (err) { setError(errorMessage(err)); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(result.inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError('Copy failed. Select the link and copy it manually.'); }
  };

  return (
    <Modal open={open} onClose={close} title={result ? 'Invitation created' : 'Invite a teammate'}
      footer={result ? <Button onClick={close}>Done</Button> : <><Button variant="secondary" onClick={close}>Cancel</Button><Button loading={busy} disabled={!email} onClick={submit}>Create invitation</Button></>}>
      {result ? (
        <div className="space-y-4">
          <Notice tone="warn" title="Email isn’t configured, so nothing was sent">Share this link with {result.invitation.email} yourself. It works once, expires in 7 days, and only the invited email address can accept it. It won’t be shown again.</Notice>
          <div className="flex gap-2"><input readOnly value={result.inviteLink} onFocus={(e) => e.target.select()} aria-label="Invitation link" className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 font-mono text-xs" /><Button variant="secondary" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button></div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {error && <Notice tone="error">{error}</Notice>}
          <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="teammate@company.com" autoFocus />
          <Select label="Role" value={role} onChange={(e) => setRole(e.target.value)} hint={ROLE_HELP[role]}>
            {isOwner && <option value="admin">Admin</option>}<option value="agent">Agent</option><option value="viewer">Viewer</option>
          </Select>
        </form>
      )}
    </Modal>
  );
}

export default function Team() {
  const { user, orgId, role, can, refresh } = useAuth();
  const toast = useToast();
  const members = useFetch(() => api.get('/org/members').then((r) => r.data), [orgId]);
  const invites = useFetch(() => (can('admin') ? api.get('/org/invitations').then((r) => r.data) : Promise.resolve([])), [orgId, role]);
  const org = useFetch(() => api.get('/org').then((r) => r.data), [orgId]);
  const [inviting, setInviting] = useState(false);
  const [removing, setRemoving] = useState(null);

  const reloadAll = () => { members.reload(); invites.reload(); org.reload(); };
  const canManage = (m) => can('admin') && m.role !== 'owner' && m.user.id !== user.id && (role === 'owner' || m.role !== 'admin');

  const changeRole = async (m, next) => {
    try { await api.patch(`/org/members/${m.id}`, { role: next }); toast.success(`${m.user.name} is now ${roleLabel(next)}.`); members.reload(); }
    catch (e) { toast.error(errorMessage(e)); members.reload(); }
  };

  return (
    <>
      <PageHeader title="Team" description="Who can access this workspace and what they can do." actions={can('admin') && <Button icon={MailPlus} onClick={() => setInviting(true)}>Invite teammate</Button>} />
      {org.data && (
        <Card className="mb-6 p-5"><Meter label={`Seats on the ${org.data.plan.name} plan`} used={org.data.usage.members + org.data.usage.pendingInvites} limit={org.data.limits.members} /><p className="mt-2 text-xs text-slate-500">Pending invitations count toward your limit.</p></Card>
      )}
      <Card>
        <CardHeader title={`Members${members.data ? ` (${members.data.length})` : ''}`} />
        {members.error && !members.data ? <ErrorState message={members.error} onRetry={members.reload} /> : !members.data ? <SkeletonRows rows={4} /> : (
          <ul className="divide-y divide-slate-100">
            {members.data.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                <Avatar name={m.user.name} size="lg" />
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{m.user.name}{m.user.id === user.id && <span className="ml-2 text-xs font-medium text-slate-400">You</span>}</p><p className="truncate text-xs text-slate-500">{m.user.email} · Joined {formatDate(m.joinedAt)}</p></div>
                {canManage(m) ? (
                  <select value={m.role} onChange={(e) => changeRole(m, e.target.value)} aria-label={`Role for ${m.user.name}`} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm">
                    {role === 'owner' && <option value="admin">Admin</option>}{m.role === 'admin' && role !== 'owner' && <option value="admin">Admin</option>}<option value="agent">Agent</option><option value="viewer">Viewer</option>
                  </select>
                ) : <Badge tone={m.role === 'owner' ? 'violet' : 'slate'}>{roleLabel(m.role)}</Badge>}
                {(canManage(m) || (m.user.id === user.id && m.role !== 'owner')) && (
                  <Button size="sm" variant="ghost" icon={Trash2} className="text-red-600 hover:bg-red-50" aria-label={m.user.id === user.id ? 'Leave workspace' : `Remove ${m.user.name}`} onClick={() => setRemoving(m)}>{m.user.id === user.id ? 'Leave' : ''}</Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>

      {can('admin') && (
        <Card className="mt-6">
          <CardHeader title="Pending invitations" description="Invitation links are shared manually until an email provider is configured." />
          {invites.error ? <ErrorState message={invites.error} onRetry={invites.reload} /> : !invites.data ? <SkeletonRows rows={2} /> : invites.data.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500"><Users className="mx-auto mb-2 h-6 w-6 text-slate-300" aria-hidden />No pending invitations.</p>
          ) : (
            <ul className="divide-y divide-slate-100">{invites.data.map((i) => (
              <li key={i.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-bold text-slate-900">{i.email}</p><p className="text-xs text-slate-500">{roleLabel(i.role)} · Sent {timeAgo(i.createdAt)} · Expires {formatDate(i.expiresAt)}</p></div>
                <Button size="sm" variant="secondary" onClick={async () => { try { await api.del(`/org/invitations/${i.id}`); toast.success('Invitation revoked.'); reloadAll(); } catch (e) { toast.error(errorMessage(e)); } }}>Revoke</Button>
              </li>
            ))}</ul>
          )}
        </Card>
      )}

      <InviteModal open={inviting} onClose={() => setInviting(false)} onCreated={reloadAll} isOwner={role === 'owner'} />
      <ConfirmDialog open={Boolean(removing)} onClose={() => setRemoving(null)} danger confirmLabel={removing?.user.id === user.id ? 'Leave workspace' : 'Remove member'}
        title={removing?.user.id === user.id ? 'Leave this workspace?' : `Remove ${removing?.user.name}?`}
        message={removing?.user.id === user.id ? 'You will lose access immediately. Your unresolved tickets become unassigned.' : 'They lose access immediately and their unresolved tickets become unassigned.'}
        onConfirm={async () => {
          try {
            await api.del(`/org/members/${removing.id}`);
            if (removing.user.id === user.id) { await refresh(); toast.success('You left the workspace.'); } else { toast.success('Member removed.'); reloadAll(); }
          } catch (e) { toast.error(errorMessage(e)); throw e; }
        }} />
    </>
  );
}
