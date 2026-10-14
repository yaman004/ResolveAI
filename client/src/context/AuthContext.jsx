import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, getStoredOrg, setStoredOrg } from '../services/api.js';
import { ROLE_RANK } from '../utils/format.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [state, setState] = useState({ loading: true, user: null, memberships: [] });
  const [orgId, setOrgId] = useState(getStoredOrg());

  const apply = useCallback((payload) => {
    const memberships = payload.memberships || [];
    const stored = getStoredOrg();
    const active = memberships.find((m) => m.organization.id === stored) || memberships[0] || null;
    const id = active?.organization.id || null;
    setStoredOrg(id);
    setOrgId(id);
    setState({ loading: false, user: payload.user, memberships });
    return payload;
  }, []);

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me');
      return apply(data);
    } catch {
      setStoredOrg(null);
      setOrgId(null);
      setState({ loading: false, user: null, memberships: [] });
      return null;
    }
  }, [apply]);

  useEffect(() => { refresh(); }, [refresh]);
  useEffect(() => {
    const onExpired = () => { setStoredOrg(null); setOrgId(null); setState({ loading: false, user: null, memberships: [] }); };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, []);

  const login = useCallback(async (body) => apply((await api.post('/auth/login', body)).data), [apply]);
  const register = useCallback(async (body) => apply((await api.post('/auth/register', body)).data), [apply]);
  const logout = useCallback(async () => {
    try { await api.post('/auth/logout'); } catch { /* cookie may already be gone */ }
    setStoredOrg(null);
    setOrgId(null);
    setState({ loading: false, user: null, memberships: [] });
  }, []);
  const switchOrg = useCallback((id) => { setStoredOrg(id); setOrgId(id); }, []);

  const value = useMemo(() => {
    const membership = state.memberships.find((m) => m.organization.id === orgId) || null;
    const role = membership?.role || null;
    return {
      ...state,
      orgId,
      membership,
      organization: membership?.organization || null,
      role,
      can: (min) => (role ? ROLE_RANK[role] >= ROLE_RANK[min] : false),
      login, register, logout, refresh, switchOrg,
    };
  }, [state, orgId, login, register, logout, refresh, switchOrg]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
