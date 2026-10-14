import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Button, EmptyState } from '../components/ui.jsx';

export default function NotFound({ inApp = false }) {
  const body = (
    <EmptyState
      icon={Compass}
      title="Page not found"
      description="The page you’re looking for doesn’t exist or may have moved."
      action={<Link to={inApp ? '/app' : '/'}><Button>{inApp ? 'Back to overview' : 'Back to home'}</Button></Link>}
    />
  );
  if (inApp) return body;
  return <div className="flex min-h-screen items-center justify-center bg-surface"><div className="max-w-md">{body}</div></div>;
}
