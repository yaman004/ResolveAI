import axios from 'axios';

const ORG_KEY = 'resolveai.orgId'; // non-secret: just remembers which workspace is active

export const getStoredOrg = () => {
  try { return localStorage.getItem(ORG_KEY); } catch { return null; }
};
export const setStoredOrg = (id) => {
  try { id ? localStorage.setItem(ORG_KEY, id) : localStorage.removeItem(ORG_KEY); } catch { /* storage unavailable */ }
};

export const http = axios.create({ baseURL: '/api', withCredentials: true, timeout: 45000 });

http.interceptors.request.use((cfg) => {
  const org = getStoredOrg();
  if (org) cfg.headers['X-Org-Id'] = org;
  return cfg;
});

http.interceptors.response.use(
  (r) => r,
  (err) => {
    const url = err.config?.url || '';
    const isAuthCall = url.startsWith('/auth/login') || url.startsWith('/auth/register') || url.startsWith('/auth/me');
    if (err.response?.status === 401 && !isAuthCall) window.dispatchEvent(new Event('auth:expired'));
    return Promise.reject(err);
  }
);

const unwrap = (p) => p.then((r) => r.data);

export const api = {
  get: (url, params) => unwrap(http.get(url, { params })),
  post: (url, body) => unwrap(http.post(url, body)),
  patch: (url, body) => unwrap(http.patch(url, body)),
  del: (url) => unwrap(http.delete(url)),
};
