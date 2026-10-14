import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { clearDb, createTestApp, PASSWORD, signup, startDb, stopDb } from './helpers.js';

let app;
beforeAll(async () => {
  await startDb();
  app = await createTestApp();
});
afterAll(stopDb);
beforeEach(clearDb);

describe('registration and login', () => {
  it('registers a user, sets an httpOnly cookie and never returns the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Jane Doe', email: 'Jane@Example.com', password: PASSWORD });
    expect(res.status).toBe(201);
    expect(res.body.data.user.email).toBe('jane@example.com');
    expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    const cookie = res.headers['set-cookie'].join(';');
    expect(cookie).toMatch(/resolveai_token=/);
    expect(cookie).toMatch(/HttpOnly/i);
  });

  it('rejects duplicate emails and weak passwords', async () => {
    await signup(app, 'Jane Doe', 'jane@example.com');
    const dup = await request(app).post('/api/auth/register').send({ name: 'Jane Two', email: 'jane@example.com', password: PASSWORD });
    expect(dup.status).toBe(409);
    const weak = await request(app).post('/api/auth/register').send({ name: 'Weak One', email: 'weak@example.com', password: 'short' });
    expect(weak.status).toBe(400);
    expect(weak.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('logs in with correct credentials and rejects wrong ones with the same message', async () => {
    await signup(app, 'Jane Doe', 'jane@example.com');
    const ok = await request(app).post('/api/auth/login').send({ email: 'jane@example.com', password: PASSWORD });
    expect(ok.status).toBe(200);
    const bad = await request(app).post('/api/auth/login').send({ email: 'jane@example.com', password: 'wrong-password1' });
    const unknown = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com', password: 'wrong-password1' });
    expect(bad.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(bad.body.error.message).toBe(unknown.body.error.message);
  });
});

describe('protected endpoints and sessions', () => {
  it('requires authentication', async () => {
    for (const [method, url] of [['get', '/api/auth/me'], ['get', '/api/orgs'], ['get', '/api/tickets'], ['get', '/api/knowledge'], ['get', '/api/analytics'], ['get', '/api/notifications']]) {
      const res = await request(app)[method](url);
      expect(res.status, `${method} ${url}`).toBe(401);
    }
  });

  it('keeps the session via cookie and ends it on logout', async () => {
    const { agent } = await signup(app, 'Jane Doe', 'jane@example.com');
    const me = await agent.get('/api/auth/me');
    expect(me.status).toBe(200);
    expect(me.body.data.user.email).toBe('jane@example.com');
    await agent.post('/api/auth/logout');
    const after = await agent.get('/api/auth/me');
    expect(after.status).toBe(401);
  });

  it('rejects a tampered token', async () => {
    const res = await request(app).get('/api/auth/me').set('Cookie', 'resolveai_token=not.a.jwt');
    expect(res.status).toBe(401);
  });

  it('changes password only with the correct current password', async () => {
    const { agent } = await signup(app, 'Jane Doe', 'jane@example.com');
    const bad = await agent.patch('/api/auth/profile').send({ currentPassword: 'nope-nope-1', newPassword: 'NewPassw0rd!' });
    expect(bad.status).toBe(400);
    const good = await agent.patch('/api/auth/profile').send({ currentPassword: PASSWORD, newPassword: 'NewPassw0rd!' });
    expect(good.status).toBe(200);
    const login = await request(app).post('/api/auth/login').send({ email: 'jane@example.com', password: 'NewPassw0rd!' });
    expect(login.status).toBe(200);
  });
});
