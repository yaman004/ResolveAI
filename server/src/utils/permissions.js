export const ROLES = ['viewer', 'agent', 'admin', 'owner'];
export const roleRank = (role) => ROLES.indexOf(role);
export const hasRole = (role, minRole) => roleRank(role) >= roleRank(minRole);
