import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { FullPageSpinner, Button, EmptyState } from './ui.jsx';

export function RequireAuth() {
  const { loading, user } = useAuth();
  const loc = useLocation();
  if (loading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace state={{ from: loc.pathname + loc.search }} />;
  return <Outlet />;
}

// Users with no workspace are sent through onboarding first.
export function RequireOrg() {
  const { memberships } = useAuth();
  if (!memberships.length) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

export function GuestOnly() {
  const { loading, user } = useAuth();
  if (loading) return <FullPageSpinner />;
  if (user) return <Navigate to="/app" replace />;
  return <Outlet />;
}

export function Forbidden({ message = 'Your role does not allow access to this area. Ask a workspace admin if you need it.' }) {
  return (
    <EmptyState
      icon={ShieldAlert}
      title="You don’t have access"
      description={message}
      action={<Link to="/app"><Button variant="secondary">Back to overview</Button></Link>}
    />
  );
}
