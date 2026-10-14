import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearDb, createTestApp, fixture, makeOrg, setPlan, signup, startDb, stopDb, ticketPayload } from './helpers.js';

let app;
let config;
let f;
let ticketId;
const H = () => ({ 'x-org-id': f.orgId });

const aiOk = (payload) => ({ ok: true, status: 200, json: async () => ({ model: 'test-model', choices: [{ message: { content: typeof payload === 'string' ? payload : JSON.stringify(payload) } }] }) });
const aiFail = (status) => ({ ok: false, status, json: async () => ({}) });
const usage = async () => (await f.owner.agent.get('/api/ai/status').set(H())).body.data;

beforeAll(async () => {
  await startDb();
  app = await createTestApp();
  ({ config } = await import('../src/config/env.js'));
});
afterAll(stopDb);
beforeEach(async () => {
  await clearDb();
  f = await fixture(app);
  const t = await f.agent.agent.post('/api/tickets').set(H()).send(ticketPayload({ subject: 'Refund for last month', description: 'Please refund my last payment. I was charged but never used the product.' }));
  ticketId = t.body.data.id;
  await f.agent.agent.post('/api/knowledge').set(H()).send({ title: 'Refund policy', body: 'Monthly plans can be refunded within 14 days of the first payment.', category: 'Billing', tags: ['refund'], status: 'published' });
  await f.agent.agent.post('/api/knowledge').set(H()).send({ title: 'Refund internal draft', body: 'Draft only: refunds up to 90 days.', category: 'Billing', tags: ['refund'], status: 'draft' });
  config.ai.apiKey = 'test-key';
});
afterEach(() => {
  config.ai.apiKey = undefined;
  vi.unstubAllGlobals();
});

const suggest = (user = f.agent, body = {}) => user.agent.post(`/api/tickets/${ticketId}/ai-reply`).set(H()).send(body);

describe('AI reply generation', () => {
  it('returns a clear setup message when no API key is configured, and the rest of the app still works', async () => {
    config.ai.apiKey = undefined;
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const res = await suggest();
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('AI_NOT_CONFIGURED');
    expect(res.body.error.message).toMatch(/AI_API_KEY/);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect((await usage()).configured).toBe(false);
    expect((await usage()).used).toBe(0);
    expect((await f.agent.agent.get(`/api/tickets/${ticketId}`).set(H())).status).toBe(200);
  });

  it('grounds the prompt in the organization’s published articles and never posts the draft', async () => {
    const fetchMock = vi.fn().mockResolvedValue(aiOk({ reply: 'Hi Hannah, refunds are possible within 14 days.', confidence: 'grounded', escalationNote: '' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await suggest();
    expect(res.status).toBe(200);
    expect(res.body.data.suggestion).toMatch(/14 days/);
    expect(res.body.data.confidence).toBe('grounded');
    expect(res.body.data.sources.map((s) => s.title)).toEqual(['Refund policy']);
    expect(res.body.data.usage.used).toBe(1);

    const sent = JSON.parse(fetchMock.mock.calls[0][1].body);
    const prompt = sent.messages.map((m) => m.content).join('\n');
    expect(prompt).toMatch(/Monthly plans can be refunded within 14 days/);
    expect(prompt).not.toMatch(/Draft only: refunds up to 90 days/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer test-key');

    const detail = await f.agent.agent.get(`/api/tickets/${ticketId}`).set(H());
    expect(detail.body.data.messages).toHaveLength(0); // nothing auto-sent
    expect((await usage()).used).toBe(1);
  });

  it('does not use another organization’s articles', async () => {
    const other = await signup(app, 'Other Owner', 'other@o.test');
    const otherOrg = await makeOrg(other.agent, 'Other Org');
    await other.agent.post('/api/knowledge').set('x-org-id', otherOrg).send({ title: 'Refund policy of Other Org', body: 'OTHER-ORG-SECRET: refunds within 365 days.', tags: ['refund'], status: 'published' });
    const fetchMock = vi.fn().mockResolvedValue(aiOk({ reply: 'ok', confidence: 'grounded', escalationNote: '' }));
    vi.stubGlobal('fetch', fetchMock);
    await suggest(f.agent, { articleIds: [] });
    const articles = (await f.owner.agent.get('/api/knowledge?status=published').set(H())).body.data;
    expect(articles).toHaveLength(1);
    // Even if a client passes another org's article id, it is ignored.
    const foreign = (await other.agent.get('/api/knowledge').set('x-org-id', otherOrg)).body.data[0].id;
    await suggest(f.agent, { articleIds: [foreign] });
    for (const call of fetchMock.mock.calls) expect(call[1].body).not.toMatch(/OTHER-ORG-SECRET/);
  });

  it('tells the model to acknowledge missing knowledge and surfaces low confidence', async () => {
    await f.admin.agent.get('/api/knowledge').set(H());
    const noKb = await f.owner.agent.get('/api/knowledge').set(H());
    for (const a of noKb.body.data) await f.admin.agent.delete(`/api/knowledge/${a.id}`).set(H());
    const fetchMock = vi.fn().mockResolvedValue(aiOk({ reply: 'I am checking with the team.', confidence: 'insufficient', escalationNote: 'No policy found; ask billing.' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await suggest();
    expect(res.status).toBe(200);
    expect(res.body.data.sources).toEqual([]);
    expect(res.body.data.confidence).toBe('insufficient');
    expect(res.body.data.escalationNote).toMatch(/billing/);
    const prompt = JSON.parse(fetchMock.mock.calls[0][1].body).messages.map((m) => m.content).join('\n');
    expect(prompt).toMatch(/No relevant knowledge base articles were found/);
    expect(prompt).toMatch(/do not guess|Do not guess/i);
  });

  it('handles non-JSON model output without crashing', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(aiOk('Just a plain text reply.')));
    const res = await suggest();
    expect(res.status).toBe(200);
    expect(res.body.data.suggestion).toBe('Just a plain text reply.');
    expect(res.body.data.confidence).toBe('unknown');
  });
});

describe('AI provider failures', () => {
  const cases = [
    ['rate limited', () => vi.fn().mockResolvedValue(aiFail(429)), 429, 'AI_RATE_LIMITED'],
    ['bad API key', () => vi.fn().mockResolvedValue(aiFail(401)), 502, 'AI_AUTH_FAILED'],
    ['unknown model', () => vi.fn().mockResolvedValue(aiFail(404)), 502, 'AI_MODEL_NOT_FOUND'],
    ['provider error', () => vi.fn().mockResolvedValue(aiFail(500)), 502, 'AI_PROVIDER_ERROR'],
    ['network failure', () => vi.fn().mockRejectedValue(new TypeError('fetch failed')), 502, 'AI_UNREACHABLE'],
    ['timeout', () => vi.fn().mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' })), 504, 'AI_TIMEOUT'],
    ['empty response', () => vi.fn().mockResolvedValue(aiOk('')), 502, 'AI_EMPTY_RESPONSE'],
  ];
  for (const [name, make, status, code] of cases) {
    it(`maps ${name} to ${status} ${code} and does not consume quota`, async () => {
      vi.stubGlobal('fetch', make());
      const res = await suggest();
      expect(res.status).toBe(status);
      expect(res.body.error.code).toBe(code);
      expect(JSON.stringify(res.body)).not.toMatch(/test-key/);
      expect((await usage()).used).toBe(0);
    });
  }

  it('enforces the monthly plan limit on the server', async () => {
    const owner = await signup(app, 'Free Owner', 'free@o.test');
    const orgId = await makeOrg(owner.agent, 'Free Org');
    await setPlan(orgId, 'free'); // 25 AI replies / month
    const t = await owner.agent.post('/api/tickets').set('x-org-id', orgId).send(ticketPayload());
    const { Subscription } = await import('../src/models/Subscription.js');
    await Subscription.updateOne({ organization: orgId }, { $set: { aiRepliesUsed: 25 } });
    const fetchMock = vi.fn().mockResolvedValue(aiOk({ reply: 'x', confidence: 'grounded', escalationNote: '' }));
    vi.stubGlobal('fetch', fetchMock);
    const res = await owner.agent.post(`/api/tickets/${t.body.data.id}/ai-reply`).set('x-org-id', orgId).send({});
    expect(res.status).toBe(402);
    expect(res.body.error.code).toBe('AI_LIMIT_REACHED');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is restricted to agents and above', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(aiOk({ reply: 'x', confidence: 'grounded', escalationNote: '' })));
    expect((await suggest(f.viewer)).status).toBe(403);
    expect((await suggest(f.agent)).status).toBe(200);
  });
});
