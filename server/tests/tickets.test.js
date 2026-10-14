import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { clearDb, createTestApp, fixture, startDb, stopDb, ticketPayload } from './helpers.js';

let app;
let f;
const H = () => ({ 'x-org-id': f.orgId });
const post = (u, url, body) => u.agent.post(url).set(H()).send(body);

beforeAll(async () => {
  await startDb();
  app = await createTestApp();
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  f = await fixture(app);
});

describe('ticket creation and updates', () => {
  it('creates tickets with sequential per-organization numbers', async () => {
    const a = await post(f.agent, '/api/tickets', ticketPayload());
    const b = await post(f.agent, '/api/tickets', ticketPayload({ subject: 'Second ticket' }));
    expect(a.status).toBe(201);
    expect([a.body.data.number, b.body.data.number]).toEqual([1, 2]);
    expect(a.body.data.status).toBe('open');
    expect(a.body.data.priority).toBe('medium');
  });

  it('validates input', async () => {
    const res = await post(f.agent, '/api/tickets', { subject: 'x', customerEmail: 'not-an-email' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.details).toHaveProperty('subject');
    expect(res.body.error.details).toHaveProperty('customerEmail');
  });

  it('ignores fields a client should not control (mass assignment)', async () => {
    const res = await post(f.agent, '/api/tickets', ticketPayload({ number: 999, resolvedAt: '2020-01-01', organization: '507f1f77bcf86cd799439011', createdBy: '507f1f77bcf86cd799439011', priorityRank: 99 }));
    expect(res.status).toBe(201);
    expect(res.body.data.number).toBe(1);
    expect(res.body.data.resolvedAt).toBeNull();
    expect(res.body.data.organization).toBe(f.orgId);
    expect(res.body.data.priorityRank).toBe(2);
  });

  it('updates status/priority/assignee, sets and clears resolvedAt, and persists', async () => {
    const t = (await post(f.agent, '/api/tickets', ticketPayload())).body.data;
    const patch = (body) => f.agent.agent.patch(`/api/tickets/${t.id}`).set(H()).send(body);

    const r1 = await patch({ status: 'in_progress', priority: 'urgent', assignee: f.agent.user.id });
    expect(r1.status).toBe(200);
    expect(r1.body.data.assignee.name).toBe('Alice Agent');
    expect(r1.body.data.priorityRank).toBe(4);

    const r2 = await patch({ status: 'resolved' });
    expect(r2.body.data.resolvedAt).toBeTruthy();
    const r3 = await patch({ status: 'open', assignee: null });
    expect(r3.body.data.resolvedAt).toBeNull();
    expect(r3.body.data.assignee).toBeNull();

    const fresh = await f.owner.agent.get(`/api/tickets/${t.id}`).set(H());
    expect(fresh.body.data.ticket.status).toBe('open');
    expect((await patch({ status: 'bogus' })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
  });

  it('refuses to assign tickets to viewers', async () => {
    const t = (await post(f.agent, '/api/tickets', ticketPayload())).body.data;
    const res = await f.agent.agent.patch(`/api/tickets/${t.id}`).set(H()).send({ assignee: f.viewer.user.id });
    expect(res.status).toBe(400);
  });
});

describe('conversation', () => {
  it('stores replies, internal notes and customer messages in order', async () => {
    const t = (await post(f.agent, '/api/tickets', ticketPayload())).body.data;
    const url = `/api/tickets/${t.id}/messages`;
    expect((await post(f.agent, url, { type: 'reply', body: 'We are on it.' })).status).toBe(201);
    expect((await post(f.agent, url, { type: 'note', body: 'Customer is on the Pro plan.' })).status).toBe(201);
    expect((await post(f.agent, url, { type: 'customer', body: 'Thanks!' })).status).toBe(201);
    expect((await post(f.agent, url, { type: 'reply', body: '   ' })).status).toBe(400);
    expect((await post(f.agent, url, { type: 'sms', body: 'x' })).status).toBe(400);

    const detail = await f.viewer.agent.get(`/api/tickets/${t.id}`).set(H());
    expect(detail.body.data.messages.map((m) => m.type)).toEqual(['reply', 'note', 'customer']);
    expect(detail.body.data.messages[0].author.name).toBe('Alice Agent');
  });
});

describe('listing, filtering, pagination and stats', () => {
  beforeEach(async () => {
    const specs = [
      ['Billing question', 'low', 'Billing'],
      ['Login broken', 'urgent', 'Account'],
      ['Report slow', 'high', 'Technical'],
      ['Refund please', 'medium', 'Billing'],
      ['Dark mode request', 'low', 'Feature request'],
    ];
    for (const [subject, priority, category] of specs) {
      await post(f.agent, '/api/tickets', ticketPayload({ subject, priority, category }));
    }
    const list = await f.owner.agent.get('/api/tickets').set(H());
    const loginId = list.body.data.find((t) => t.subject === 'Login broken').id;
    await f.agent.agent.patch(`/api/tickets/${loginId}`).set(H()).send({ status: 'resolved' });
  });

  it('filters by status, priority, category and search text', async () => {
    const get = (qs) => f.owner.agent.get(`/api/tickets?${qs}`).set(H());
    expect((await get('status=resolved')).body.data.map((t) => t.subject)).toEqual(['Login broken']);
    expect((await get('status=open,in_progress')).body.meta.total).toBe(4);
    expect((await get('priority=low')).body.meta.total).toBe(2);
    expect((await get('category=Billing')).body.meta.total).toBe(2);
    expect((await get('q=refund')).body.data).toHaveLength(1);
    expect((await get('q=%233')).body.data[0].subject).toBe('Report slow'); // "#3"
    expect((await get('q=.*')).body.data).toHaveLength(0); // regex characters are escaped
    expect((await get('assignee=unassigned')).body.meta.total).toBe(5);
  });

  it('sorts by priority and paginates with a capped page size', async () => {
    const sorted = await f.owner.agent.get('/api/tickets?sort=priority&order=desc').set(H());
    expect(sorted.body.data[0].priority).toBe('urgent');
    const page = await f.owner.agent.get('/api/tickets?limit=2&page=2&sort=number&order=asc').set(H());
    expect(page.body.data.map((t) => t.number)).toEqual([3, 4]);
    expect(page.body.meta).toMatchObject({ page: 2, limit: 2, total: 5, pages: 3 });
    const huge = await f.owner.agent.get('/api/tickets?limit=5000').set(H());
    expect(huge.status).toBe(400);
  });

  it('computes stats from real records', async () => {
    const stats = await f.owner.agent.get('/api/tickets/stats').set(H());
    expect(stats.body.data).toMatchObject({ total: 5, open: 4, resolved: 1, unresolved: 4, urgent: 0, unassigned: 4 });
  });
});

describe('analytics', () => {
  it('handles an empty workspace gracefully', async () => {
    const res = await f.owner.agent.get('/api/analytics?range=30').set(H());
    expect(res.status).toBe(200);
    expect(res.body.data.totals.total).toBe(0);
    expect(res.body.data.avgResolutionHours).toBeNull();
    expect(res.body.data.volume).toHaveLength(30);
  });

  it('reports volume, resolution time and workload from actual tickets', async () => {
    const t1 = (await post(f.agent, '/api/tickets', ticketPayload({ priority: 'urgent', assignee: f.agent.user.id }))).body.data;
    const t2 = (await post(f.agent, '/api/tickets', ticketPayload({ subject: 'Another one' }))).body.data;
    await f.agent.agent.patch(`/api/tickets/${t2.id}`).set(H()).send({ status: 'resolved' });
    const res = await f.owner.agent.get('/api/analytics?range=7').set(H());
    const d = res.body.data;
    expect(d.totals).toMatchObject({ total: 2, open: 1, resolved: 1, urgent: 1 });
    expect(d.createdInRange).toBe(2);
    expect(d.volume.reduce((a, v) => a + v.created, 0)).toBe(2);
    expect(d.volume.reduce((a, v) => a + v.resolved, 0)).toBe(1);
    expect(d.avgResolutionHours).not.toBeNull();
    expect(d.workload).toEqual([{ id: f.agent.user.id, name: 'Alice Agent', open: 1 }]);
    expect(d.recentActivity.length).toBeGreaterThan(0);
    void t1;
  });
});
