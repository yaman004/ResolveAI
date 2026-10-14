import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Quote } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { Button, Input, Logo, Notice } from '../components/ui.jsx';
import { errorMessage, fieldErrors } from '../utils/format.js';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1fr_1.05fr]">
      <div className="flex flex-col px-6 py-8 sm:px-12">
        <Link to="/" aria-label="ResolveAI home"><Logo /></Link>
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-10">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <p className="mt-6 text-sm text-slate-600">{footer}</p>
        </div>
      </div>
      <div className="relative hidden overflow-hidden bg-navy-900 lg:block">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" aria-hidden />
        <div className="absolute -bottom-32 left-10 h-96 w-96 rounded-full bg-indigo-500/20 blur-3xl" aria-hidden />
        <div className="relative flex h-full flex-col justify-end p-14">
          <Quote className="h-8 w-8 text-brand-300" aria-hidden />
          <p className="mt-5 max-w-md text-2xl font-bold leading-snug text-white">Answer from what your company actually knows, and keep a human in charge of every reply.</p>
          <p className="mt-4 text-sm text-slate-400">AI drafts are grounded in your published articles and never sent without agent approval.</p>
        </div>
      </div>
    </div>
  );
}

function useRedirect() {
  const loc = useLocation();
  const [params] = useSearchParams();
  const target = params.get('redirect') || loc.state?.from || '/app';
  return target.startsWith('/') && !target.startsWith('//') ? target : '/app'; // never redirect off-site
}

export function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const redirect = useRedirect();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({ defaultValues: { email: '', password: '' } });
  const onSubmit = async (v) => {
    setFormError('');
    try { await login(v); nav(redirect, { replace: true }); } catch (e) { setFormError(errorMessage(e)); }
  };
  return (
    <AuthShell title="Welcome back" subtitle="Log in to your support workspace." footer={<>New to ResolveAI? <Link to={`/register${redirect !== '/app' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-bold text-brand-700 hover:underline">Create an account</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
        <Input label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password', { required: 'Enter your password' })} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Log in</Button>
      </form>
    </AuthShell>
  );
}

export function Register() {
  const { register: signUp } = useAuth();
  const nav = useNavigate();
  const redirect = useRedirect();
  const [formError, setFormError] = useState('');
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm({ defaultValues: { name: '', email: '', password: '' } });
  const onSubmit = async (v) => {
    setFormError('');
    try {
      await signUp(v);
      nav(redirect !== '/app' ? redirect : '/onboarding', { replace: true });
    } catch (e) {
      const details = fieldErrors(e);
      let shown = false;
      for (const k of ['name', 'email', 'password']) if (details[k]) { setError(k, { message: details[k] }); shown = true; }
      if (!shown) setFormError(errorMessage(e));
    }
  };
  return (
    <AuthShell title="Create your account" subtitle="Free plan. No card required." footer={<>Already have an account? <Link to={`/login${redirect !== '/app' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`} className="font-bold text-brand-700 hover:underline">Log in</Link></>}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {formError && <Notice tone="error">{formError}</Notice>}
        <Input label="Full name" autoComplete="name" error={errors.name?.message} {...register('name', { required: 'Enter your name', minLength: { value: 2, message: 'Name must be at least 2 characters' } })} />
        <Input label="Work email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email', { required: 'Enter your email', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
        <Input label="Password" type="password" autoComplete="new-password" hint="At least 8 characters, with a letter and a number." error={errors.password?.message} {...register('password', { required: 'Choose a password', minLength: { value: 8, message: 'Password must be at least 8 characters' }, validate: (v) => (/[A-Za-z]/.test(v) && /\d/.test(v)) || 'Include at least one letter and one number' })} />
        <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>Create account</Button>
      </form>
    </AuthShell>
  );
}
