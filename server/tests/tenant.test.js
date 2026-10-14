import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { addMember, clearDb, createTestApp, fixture, makeOrg, setPlan, signup, startDb, stopDb, ticketPayload } from './helpers.js';

let app;
beforeAll(async () => {
  await startDb();
  app = await createTestApp();
});
afterAll(stopDb);
beforeEach(clearDb);

async function twoOrgs() {
  const a = await signup(app, 'Alice Owner', 'alice@a.test');
  const orgA = await makeOrg(a.agent, 'Org A');
  const b = await signup(app, 'Bob Owner', 'bob@b.test');
  const orgB = await makeOrg(b.agent, 'Org B');
  return { a, b, orgA, orgB };
}

describe('organization membership checks', () => {
  it('requires a valid workspace header', async () => {
    const { a } = await twoOrgs();
    const none = await a.agent.get('/api/tickets');
    expect(none.status).toBe(400);
    const junk = await a.agent.get('/api/tickets').set('x-org-id', 'not-an-id');
    expect(junk.status).toBe(400);
  });

  it('forbids using an organization id the user does not belong to', async () => {
    const { a, orgB } = await twoOrgs();
    for (const url of ['/api/tickets', '/api/tickets/stats', '/api/knowledge', '/api/analytics', '/api/org/members', '/api/org/billing', '/api/notifications']) {
      const res = await a.agent.get(url).set('x-org-id', orgB);
      expect(res.status, url).toBe(403);
      expect(res.body.error.code).toBe('NOT_A_MEMBER');
    }
    const create = await a.agent.post('/api/tickets').set('x-org-id', orgB).send(ticketPayload());
    expect(create.status).toBe(403);
  });
});

describe('cross-tenant record isolation', () => {
  it('cannot read, edit, message, delete or AI-draft another organization’s ticket by id', async () => {
    const { a, b, orgA, orgB } = await twoOrgs();
    const t = await a.agent.post('/api/tickets').set('x-org-id', orgA).send(ticketPayload());
    expect(t.status).toBe(201);
    const id = t.body.data.id;

    // Bob is a legit owner of org B and sends org B's header, but targets org A's ticket id.
    const get = await b.agent.get(`/api/tickets/${id}`).set('x-org-id', orgB);
    expect(get.status).toBe(404);
    const patch = await b.agent.patch(`/api/tickets/${id}`).set('x-org-id', orgB).send({ status: 'resolved' });
    expect(patch.status).toBe(404);
    const msg = await b.agent.post(`/api/tickets/${id}/messages`).set('x-org-id', orgB).send({ type: 'reply', body: 'hello' });
    expect(msg.status).toBe(404);
    const del = await b.agent.delete(`/api/tickets/${id}`).set('x-org-id', orgB);
    expect(del.status).toBe(404);
    const ai = await b.agent.post(`/api/tickets/${id}/ai-reply`).set('x-org-id', orgB).send({});
    expect(ai.status).toBe(404);

    const still = await a.agent.get(`/api/tickets/${id}`).set('x-org-id', orgA);
    expect(still.body.data.ticket.status).toBe('open');
    expect(still.body.data.messages).toHaveLength(0);
  });

  it('never lists another organization’s tickets, articles or history', async () => {
    const { a, b, orgA, orgB } = await twoOrgs();
    await a.agent.post('/api/tickets').set('x-org-id', orgA).send(ticketPayload({ subject: 'Secret A ticket' }));
    await a.agent.post('/api/knowledge').set('x-org-id', orgA).send({ title: 'Secret A article', body: 'Only for organization A.', status: 'published' });
    const tickets = await b.agent.get('/api/tickets').set('x-org-id', orgB);
    expect(tickets.body.data).toHaveLength(0);
    const kb = await b.agent.get('/api/knowledge').set('x-org-id', orgB);
    expect(kb.body.data).toHaveLength(0);
    // Same customer email in org B must not surface org A history.
    const mine = await b.agent.post('/api/tickets').set('x-org-id', orgB).send(ticketPayload());
    const detail = await b.agent.get(`/api/tickets/${mine.body.data.id}`).set('x-org-id', orgB);
    expect(detail.body.data.customerHistory).toHaveLength(0);
    expect(detail.body.data.ticket.number).toBe(1);
  });

  it('cannot read or modify another organization’s knowledge article', async () => {
    const { a, b, orgA, orgB } = await twoOrgs();
    const art = await a.agent.post('/api/knowledge').set('x-org-id', orgA).send({ title: 'A private doc', body: 'Internal organization A content.', status: 'published' });
    const id = art.body.data.id;
    expect((await b.agent.get(`/api/knowledge/${id}`).set('x-org-id', orgB)).status).toBe(404);
    expect((await b.agent.patch(`/api/knowledge/${id}`).set('x-org-id', orgB).send({ title: 'Hijacked' })).status).toBe(404);
    expect((await b.agent.delete(`/api/knowledge/${id}`).set('x-org-id', orgB)).status).toBe(404);
  });

  it('cannot assign a ticket to a user from another organization', async () => {
    const { a, b, orgA, orgB } = await twoOrgs();
    const t = await b.agent.post('/api/tickets').set('x-org-id', orgB).send(ticketPayload());
    const res = await b.agent.patch(`/api/tickets/${t.body.data.id}`).set('x-org-id', orgB).send({ assignee: a.user.id });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_ASSIGNEE');
  });

  it('scopes notifications to the active organization and user', async () => {
    const f = await fixture(app);
    const t = await f.owner.agent.post('/api/tickets').set('x-org-id', f.orgId).send(ticketPayload({ assignee: f.agent.user.id }));
    expect(t.status).toBe(201);
    const mine = await f.agent.agent.get('/api/notifications').set('x-org-id', f.orgId);
    expect(mine.body.meta.unread).toBeGreaterThanOrEqual(1);
    const others = await f.viewer.agent.get('/api/notifications').set('x-org-id', f.orgId);
    expect(others.body.data.filter((n) => n.title.includes('assigned to you'))).toHaveLength(0);
  });
});

describe('role-based authorization', () => {
  it('enforces role minimums on tickets', async () => {
    const f = await fixture(app);
    const post = (u, body) => u.agent.post('/api/tickets').set('x-org-id', f.orgId).send(body);

    expect((await post(f.viewer, ticketPayload())).status).toBe(403);
    const created = await post(f.agent, ticketPayload());
    expect(created.status).toBe(201);
    const id = created.body.data.id;

    expect((await f.viewer.agent.get(`/api/tickets/${id}`).set('x-org-id', f.orgId)).status).toBe(200);
    expect((await f.viewer.agent.patch(`/api/tickets/${id}`).set('x-org-id', f.orgId).send({ status: 'resolved' })).status).toBe(403);
    expect((await f.viewer.agent.post(`/api/tickets/${id}/messages`).set('x-org-id', f.orgId).send({ type: 'reply', body: 'x' })).status).toBe(403);
    expect((await f.agent.agent.delete(`/api/tickets/${id}`).set('x-org-id', f.orgId)).status).toBe(403);
    expect((await f.admin.agent.delete(`/api/tickets/${id}`).set('x-org-id', f.orgId)).status).toBe(200);
  });

  it('restricts team management and billing', async () => {
    const f = await fixture(app);
    const org = f.orgId;
    // agents/viewers cannot invite
    for (const u of [f.agent, f.viewer]) {
      const r = await u.agent.post('/api/org/invitations').set('x-org-id', org).send({ email: 'x@y.test', role: 'agent' });
      expect(r.status).toBe(403);
    }
    // admins cannot invite admins, and cannot change plans
    const adminInvitesAdmin = await f.admin.agent.post('/api/org/invitations').set('x-org-id', org).send({ email: 'x@y.test', role: 'admin' });
    expect(adminInvitesAdmin.status).toBe(403);
    const adminPlan = await f.admin.agent.patch('/api/org/billing/plan').set('x-org-id', org).send({ plan: 'pro' });
    expect(adminPlan.status).toBe(403);
    const ownerPlan = await f.owner.agent.patch('/api/org/billing/plan').set('x-org-id', org).send({ plan: 'pro' });
    expect(ownerPlan.status).toBe(200);
  });

  it('protects the owner and prevents privilege escalation', async () => {
    const f = await fixture(app);
    const members = await f.owner.agent.get('/api/org/members').set('x-org-id', f.orgId);
    const find = (email) => members.body.data.find((m) => m.user.id === email.id);
    const ownerM = find(f.owner.user);
    const agentM = find(f.agent.user);
    const adminM = find(f.admin.user);

    // nobody can change/remove the owner
    expect((await f.admin.agent.patch(`/api/org/members/${ownerM.id}`).set('x-org-id', f.orgId).send({ role: 'viewer' })).status).toBe(403);
    expect((await f.owner.agent.delete(`/api/org/members/${ownerM.id}`).set('x-org-id', f.orgId)).status).toBe(403);
    // admin cannot promote to admin; owner can
    expect((await f.admin.agent.patch(`/api/org/members/${agentM.id}`).set('x-org-id', f.orgId).send({ role: 'admin' })).status).toBe(403);
    expect((await f.owner.agent.patch(`/api/org/members/${agentM.id}`).set('x-org-id', f.orgId).send({ role: 'admin' })).status).toBe(200);
    // cannot grant owner via API, cannot change own role
    expect((await f.owner.agent.patch(`/api/org/members/${adminM.id}`).set('x-org-id', f.orgId).send({ role: 'owner' })).status).toBe(400);
    expect((await f.admin.agent.patch(`/api/org/members/${adminM.id}`).set('x-org-id', f.orgId).send({ role: 'owner' })).status).toBe(400);
    // agents cannot remove others
    expect((await f.viewer.agent.delete(`/api/org/members/${agentM.id}`).set('x-org-id', f.orgId)).status).toBe(403);
  });

  it('enforces the plan member limit on invitations', async () => {
    const owner = await signup(app, 'Olivia Owner', 'o@limit.test');
    const orgId = await makeOrg(owner.agent, 'Limit Org'); // free plan: 3 members
    await addMember(app, owner.agent, orgId, 'agent', 'a1@limit.test');
    await addMember(app, owner.agent, orgId, 'agent', 'a2@limit.test');
    const over = await owner.agent.post('/api/org/invitations').set('x-org-id', orgId).send({ email: 'a3@limit.test', role: 'agent' });
    expect(over.status).toBe(402);
    expect(over.body.error.code).toBe('MEMBER_LIMIT_REACHED');
    await setPlan(orgId, 'pro');
    const ok = await owner.agent.post('/api/org/invitations').set('x-org-id', orgId).send({ email: 'a3@limit.test', role: 'agent' });
    expect(ok.status).toBe(201);
  });

  it('only lets the invited email accept an invitation', async () => {
    const owner = await signup(app, 'Olivia Owner', 'o@inv.test');
    const orgId = await makeOrg(owner.agent, 'Invite Org');
    const inv = await owner.agent.post('/api/org/invitations').set('x-org-id', orgId).send({ email: 'right@inv.test', role: 'agent' });
    const token = inv.body.data.inviteLink.split('/invite/')[1];
    expect(inv.body.data.emailDelivery).toBe('not_configured');
    const wrong = await signup(app, 'Wrong Person', 'wrong@inv.test');
    const res = await wrong.agent.post(`/api/invitations/${token}/accept`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('INVITE_EMAIL_MISMATCH');
  });
});
