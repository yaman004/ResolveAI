import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { ArrowRight, Check } from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { Button, Card, Input, Logo, Notice } from '../components/ui.jsx';
import { errorMessage, roleLabel } from '../utils/format.js';
import { setStoredOrg } from '../services/api.js';

export default function Onboarding() {
  const { user, memberships, organization, refresh, switchOrg } = useAuth();
  const nav = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '' } });

  const onSubmit = async ({ name }) => {
    setFormError('');
    try {
      const { data } = await api.post('/orgs', { name });
      setStoredOrg(data.organization.id);
      await refresh();
      toast.success(`${data.organization.name} is ready.`);
      nav('/app', { replace: true });
    } catch (e) { setFormError(errorMessage(e)); }
  };

  return (
    <div className="min-h-screen bg-surface px-4 py-10">
      <div className="mx-auto max-w-xl">
        <Link to="/" aria-label="ResolveAI home"><Logo /></Link>
        <h1 className="mt-10 text-3xl font-extrabold tracking-tight text-slate-900">{memberships.length ? 'Choose a workspace' : `Welcome, ${user.name.split(' ')[0]}`}</h1>
        <p className="mt-2 text-slate-600">{memberships.length ? 'Open one of your workspaces or create a new one.' : 'Create a workspace for your team. You will be its owner and can invite teammates next.'}</p>

        {memberships.length > 0 && (
          <Card className="mt-8 divide-y divide-slate-100">
            {memberships.map((m) => (
              <button key={m.id} onClick={() => { switchOrg(m.organization.id); nav('/app'); }} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-slate-50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 font-extrabold text-white">{m.organization.name[0].toUpperCase()}</span>
                <span className="flex-1"><span className="block font-bold text-slate-900">{m.organization.name}</span><span className="text-xs text-slate-500">{roleLabel(m.role)}</span></span>
                {organization?.id === m.organization.id ? <Check className="h-4 w-4 text-brand-600" aria-label="Current workspace" /> : <ArrowRight className="h-4 w-4 text-slate-400" aria-hidden />}
              </button>
            ))}
          </Card>
        )}

        <Card className="mt-8 p-6">
          <h2 className="text-base font-bold text-slate-900">Create a new workspace</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4" noValidate>
            {formError && <Notice tone="error">{formError}</Notice>}
            <Input label="Workspace name" placeholder="Acme Support" hint="Usually your company or team name." error={errors.name?.message} {...register('name', { required: 'Enter a workspace name', minLength: { value: 2, message: 'Name must be at least 2 characters' }, maxLength: { value: 80, message: 'Keep it under 80 characters' } })} />
            <Button type="submit" loading={isSubmitting}>Create workspace</Button>
          </form>
        </Card>
        <p className="mt-6 text-sm text-slate-500">Joining a teammate’s workspace? Open the invitation link they shared with you.</p>
      </div>
    </div>
  );
}
