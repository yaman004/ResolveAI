import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useFetch } from '../hooks/useFetch.js';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Card, ErrorState, Notice, Spinner } from '../components/ui.jsx';
import { errorMessage, roleLabel } from '../utils/format.js';

export default function AcceptInvite() {
  const { token } = useParams();
  const { user, loading: authLoading, refresh, switchOrg } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const { data, loading, error } = useFetch(() => api.get(`/invitations/${token}`).then((r) => r.data), [token]);

  const accept = async () => {
    setBusy(true); setErr('');
    try {
      const { data: res } = await api.post(`/invitations/${token}/accept`);
      switchOrg(res.organization.id);
      await refresh();
      toast.success(`You joined ${res.organization.name}.`);
      nav('/app', { replace: true });
    } catch (e) { setErr(errorMessage(e)); } finally { setBusy(false); }
  };

  const redirect = encodeURIComponent(`/invite/${token}`);
  return (
    <div className="mx-auto max-w-md px-4 py-16">
      {loading || authLoading ? <div className="flex justify-center py-20"><Spinner className="h-8 w-8" /></div> : error ? (
        <Card><ErrorState title="This invitation can’t be used" message={error} /></Card>
      ) : (
        <Card className="p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600"><MailCheck className="h-6 w-6" aria-hidden /></div>
          <h1 className="mt-5 text-2xl font-extrabold text-slate-900">Join {data.organization.name}</h1>
          <p className="mt-2 text-sm text-slate-600">You’ve been invited as <strong>{roleLabel(data.role)}</strong> using <strong>{data.email}</strong>.</p>
          <div className="mt-6 space-y-3">
            {err && <Notice tone="error">{err}</Notice>}
            {user ? (
              <>
                {user.email !== data.email && <Notice tone="warn">You’re signed in as {user.email}. This invitation is for {data.email}.</Notice>}
                <Button size="lg" className="w-full" loading={busy} onClick={accept}>Accept invitation</Button>
              </>
            ) : (
              <>
                <Link to={`/register?redirect=${redirect}`} className="block"><Button size="lg" className="w-full">Create account to join</Button></Link>
                <Link to={`/login?redirect=${redirect}`} className="block"><Button size="lg" variant="secondary" className="w-full">I already have an account</Button></Link>
                <p className="text-xs text-slate-500">Use the email address the invitation was sent to.</p>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
