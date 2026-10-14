import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { Badge, Button, Card, CardHeader, ErrorState, Input, Notice, PageHeader, Skeleton } from '../components/ui.jsx';
import { errorMessage, fieldErrors, roleLabel } from '../utils/format.js';

function ProfileCard() {
  const { user, refresh } = useAuth();
  const toast = useToast();
  const [name, setName] = useState(user.name);
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    const body = { name };
    if (pw.newPassword) Object.assign(body, pw);
    try {
      await api.patch('/auth/profile', body);
      await refresh();
      setPw({ currentPassword: '', newPassword: '' });
      toast.success('Profile saved.');
    } catch (err) {
      const d = fieldErrors(err);
      if (Object.keys(d).length) setErrors(d); else toast.error(errorMessage(err));
    } finally { setBusy(false); }
  };
  return (
    <Card>
      <CardHeader title="Your profile" description="Visible to your teammates." />
      <form onSubmit={save} className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2"><Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} error={errors.name} /><Input label="Email" value={user.email} disabled hint="Email can’t be changed yet." /></div>
        <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-2">
          <Input label="Current password" type="password" autoComplete="current-password" value={pw.currentPassword} onChange={(e) => setPw((p) => ({ ...p, currentPassword: e.target.value }))} error={errors.currentPassword} />
          <Input label="New password" type="password" autoComplete="new-password" value={pw.newPassword} onChange={(e) => setPw((p) => ({ ...p, newPassword: e.target.value }))} error={errors.newPassword} hint="Leave blank to keep your current password." />
        </div>
        <Button type="submit" loading={busy}>Save profile</Button>
      </form>
    </Card>
  );
}

function WorkspaceCard() {
  const { orgId, can, refresh } = useAuth();
  const toast = useToast();
  const { data, loading, error, reload } = useFetch(() => api.get('/org').then((r) => r.data), [orgId]);
  const [form, setForm] = useState(null);
  const [newCat, setNewCat] = useState('');
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const editable = can('admin');

  if (error && !data) return <Card><ErrorState message={error} onRetry={reload} /></Card>;
  if (loading && !data) return <Skeleton className="h-72" />;
  const o = data.organization;
  const f = form || { name: o.name, supportEmail: o.settings.supportEmail || '', categories: o.settings.categories, helpCenterEnabled: o.settings.helpCenterEnabled };
  const set = (patch) => setForm({ ...f, ...patch });

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setErrors({});
    try { await api.patch('/org', f); await refresh(); await reload(); setForm(null); toast.success('Workspace settings saved.'); }
    catch (err) { const d = fieldErrors(err); if (Object.keys(d).length) setErrors(d); else toast.error(errorMessage(err)); } finally { setBusy(false); }
  };
  const addCat = () => { const c = newCat.trim(); if (c && !f.categories.includes(c) && f.categories.length < 20) set({ categories: [...f.categories, c] }); setNewCat(''); };

  return (
    <Card>
      <CardHeader title="Workspace" description={`You are ${roleLabel(data.role).toLowerCase() === 'admin' ? 'an' : 'a'} ${roleLabel(data.role).toLowerCase()} here.`} />
      <form onSubmit={save} className="space-y-5 p-5">
        {!editable && <Notice tone="info">Only admins and the owner can change workspace settings.</Notice>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Workspace name" value={f.name} disabled={!editable} onChange={(e) => set({ name: e.target.value })} error={errors.name} />
          <Input label="Support email" type="email" value={f.supportEmail} disabled={!editable} onChange={(e) => set({ supportEmail: e.target.value })} error={errors.supportEmail} hint="Shown on your public help center." />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-semibold text-slate-700">Ticket categories</p>
          <div className="flex flex-wrap gap-2">
            {f.categories.map((c) => (
              <span key={c} className="inline-flex items-center gap-1 rounded-full bg-slate-100 py-1 pl-3 pr-2 text-sm font-medium text-slate-700">{c}{editable && f.categories.length > 1 && <button type="button" onClick={() => set({ categories: f.categories.filter((x) => x !== c) })} className="rounded-full p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={`Remove ${c}`}><X className="h-3.5 w-3.5" /></button>}</span>
            ))}
          </div>
          {errors.categories && <p className="mt-1 text-xs font-medium text-red-600">{errors.categories}</p>}
          {editable && <div className="mt-3 flex max-w-sm gap-2"><input value={newCat} onChange={(e) => setNewCat(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCat(); } }} placeholder="Add a category" aria-label="New category" maxLength={60} className="h-10 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" /><Button type="button" variant="secondary" icon={Plus} onClick={addCat}>Add</Button></div>}
        </div>
        <label className="flex items-start gap-3">
          <input type="checkbox" checked={f.helpCenterEnabled} disabled={!editable} onChange={(e) => set({ helpCenterEnabled: e.target.checked })} className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
          <span><span className="block text-sm font-semibold text-slate-800">Public help center</span><span className="text-sm text-slate-500">Publish your published articles at <code className="rounded bg-slate-100 px-1 text-xs">/help/{o.slug}</code>. Drafts are never shown.</span></span>
        </label>
        {editable && <div className="flex gap-2"><Button type="submit" loading={busy} disabled={!form}>Save workspace</Button>{form && <Button variant="ghost" onClick={() => setForm(null)}>Discard changes</Button>}</div>}
      </form>
    </Card>
  );
}

export default function Settings() {
  const { data } = useFetch(() => api.get('/ai/status').then((r) => r.data), []);
  return (
    <>
      <PageHeader title="Settings" description="Your profile and this workspace." />
      <div className="max-w-3xl space-y-6">
        <ProfileCard />
        <WorkspaceCard />
        <Card>
          <CardHeader title="AI provider" description="Configured on the server so your API key never reaches the browser." />
          <div className="space-y-2 p-5 text-sm text-slate-600">
            <p className="flex items-center gap-2">Status: {data ? (data.configured ? <Badge tone="green">Connected · {data.model}</Badge> : <Badge tone="amber">Not configured</Badge>) : <Skeleton className="h-5 w-24" />}</p>
            {data && !data.configured && <p>Set <code className="rounded bg-slate-100 px-1 text-xs">AI_API_KEY</code> in the <code className="rounded bg-slate-100 px-1 text-xs">.env</code> file and restart the server. Optional: <code className="rounded bg-slate-100 px-1 text-xs">AI_MODEL</code> and <code className="rounded bg-slate-100 px-1 text-xs">AI_BASE_URL</code> for any OpenAI-compatible provider.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
