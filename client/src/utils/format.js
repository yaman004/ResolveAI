export const idOf = (o) => (o ? o.id ?? o._id : null);

export const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'waiting', label: 'Waiting' },
  { value: 'resolved', label: 'Resolved' },
];
export const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];
export const statusLabel = (v) => STATUS_OPTIONS.find((o) => o.value === v)?.label || v;
export const priorityLabel = (v) => PRIORITY_OPTIONS.find((o) => o.value === v)?.label || v;

export const ROLE_RANK = { viewer: 1, agent: 2, admin: 3, owner: 4 };
export const roleLabel = (r) => r.charAt(0).toUpperCase() + r.slice(1);

export function timeAgo(date) {
  if (!date) return '';
  const s = Math.round((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 45) return 'just now';
  const units = [['minute', 60], ['hour', 3600], ['day', 86400], ['week', 604800], ['month', 2592000], ['year', 31536000]];
  let label = 'minute';
  let div = 60;
  for (const [u, d] of units) {
    if (s >= d) { label = u; div = d; }
  }
  const n = Math.max(1, Math.floor(s / div));
  return `${n} ${label}${n > 1 ? 's' : ''} ago`;
}

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '';
export const formatDate = (d) => (d ? new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '');

export function formatHours(h) {
  if (h == null) return '—';
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 48) return `${h} h`;
  return `${Math.round((h / 24) * 10) / 10} days`;
}

export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (err?.response?.data?.error?.message) return err.response.data.error.message;
  if (err?.code === 'ERR_NETWORK') return 'Cannot reach the server. Check that the API is running.';
  return fallback;
}
export const errorCode = (err) => err?.response?.data?.error?.code;
export const fieldErrors = (err) => err?.response?.data?.error?.details || {};
