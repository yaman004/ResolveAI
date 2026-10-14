import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { clearDb, createTestApp, fixture, startDb, stopDb } from './helpers.js';

let app;
let f;
const H = () => ({ 'x-org-id': f.orgId });
const article = (over = {}) => ({ title: 'Refund policy', body: 'Refunds are available within 14 days of purchase.', category: 'Billing', tags: ['Refund', 'refund', 'billing'], ...over });

beforeAll(async () => {
  await startDb();
  app = await createTestApp();
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  f = await fixture(app);
});

describe('knowledge base access control and behavior', () => {
  it('lets agents create and edit; viewers read only; only admins delete', async () => {
    const created = await f.agent.agent.post('/api/knowledge').set(H()).send(article());
    expect(created.status).toBe(201);
    expect(created.body.data.status).toBe('draft');
    expect(created.body.data.tags).toEqual(['refund', 'billing']); // normalized and de-duplicated
    const id = created.body.data.id;

    expect((await f.viewer.agent.post('/api/knowledge').set(H()).send(article())).status).toBe(403);
    expect((await f.viewer.agent.get(`/api/knowledge/${id}`).set(H())).status).toBe(200);
    expect((await f.viewer.agent.patch(`/api/knowledge/${id}`).set(H()).send({ title: 'Nope nope' })).status).toBe(403);

    const pub = await f.agent.agent.patch(`/api/knowledge/${id}`).set(H()).send({ status: 'published' });
    expect(pub.body.data.status).toBe('published');
    expect(pub.body.data.publishedAt).toBeTruthy();

    expect((await f.agent.agent.delete(`/api/knowledge/${id}`).set(H())).status).toBe(403);
    expect((await f.admin.agent.delete(`/api/knowledge/${id}`).set(H())).status).toBe(200);
    expect((await f.admin.agent.get(`/api/knowledge/${id}`).set(H())).status).toBe(404);
  });

  it('validates and searches', async () => {
    expect((await f.agent.agent.post('/api/knowledge').set(H()).send({ title: 'ab', body: 'short' })).status).toBe(400);
    await f.agent.agent.post('/api/knowledge').set(H()).send(article());
    await f.agent.agent.post('/api/knowledge').set(H()).send(article({ title: 'Password reset', body: 'Use the forgot password link.', category: 'Account', status: 'published' }));
    const q = await f.owner.agent.get('/api/knowledge?q=password').set(H());
    expect(q.body.data).toHaveLength(1);
    const pub = await f.owner.agent.get('/api/knowledge?status=published').set(H());
    expect(pub.body.data).toHaveLength(1);
    expect(pub.body.meta.categories).toEqual(['Account', 'Billing']);
  });

  it('serves only PUBLISHED articles on the public help center, without auth', async () => {
    await f.agent.agent.post('/api/knowledge').set(H()).send(article({ title: 'Public one', status: 'published' }));
    await f.agent.agent.post('/api/knowledge').set(H()).send(article({ title: 'Draft secret', body: 'Never show this publicly.' }));
    const org = await f.owner.agent.get('/api/org').set(H());
    const slug = org.body.data.organization.slug;

    const list = await request(app).get(`/api/public/help/${slug}`);
    expect(list.status).toBe(200);
    expect(list.body.data.articles.map((a) => a.title)).toEqual(['Public one']);
    expect(JSON.stringify(list.body)).not.toMatch(/Draft secret|author|organization":"/);

    const drafts = await f.owner.agent.get('/api/knowledge?status=draft').set(H());
    const draftId = drafts.body.data[0].id;
    expect((await request(app).get(`/api/public/help/${slug}/articles/${draftId}`)).status).toBe(404);

    await f.admin.agent.patch('/api/org').set(H()).send({ helpCenterEnabled: false });
    expect((await request(app).get(`/api/public/help/${slug}`)).status).toBe(404);
  });
});
