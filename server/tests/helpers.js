import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function startDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
  await Promise.all(Object.values(mongoose.models).map((m) => m.init()));
}
export async function stopDb() {
  await mongoose.disconnect();
  await mongod?.stop();
}
export async function clearDb() {
  for (const c of Object.values(mongoose.connection.collections)) await c.deleteMany({});
}
export async function createTestApp() {
  const { createApp } = await import('../src/app.js');
  return createApp();
}

export const PASSWORD = 'Passw0rd!x';

export async function signup(app, name, email) {
  const agent = request.agent(app);
  const res = await agent.post('/api/auth/register').send({ name, email, password: PASSWORD });
  if (res.status !== 201) throw new Error(`signup failed: ${res.status} ${JSON.stringify(res.body)}`);
  return { agent, user: res.body.data.user };
}

export async function makeOrg(agent, name = 'Test Org') {
  const res = await agent.post('/api/orgs').send({ name });
  if (res.status !== 201) throw new Error(`org failed: ${res.status} ${JSON.stringify(res.body)}`);
  return res.body.data.organization.id;
}

export async function setPlan(orgId, plan) {
  const { Subscription } = await import('../src/models/Subscription.js');
  await Subscription.updateOne({ organization: orgId }, { $set: { plan } });
}

/** Owner invites a brand-new user with `role`; the new user registers and accepts via the invite link. */
export async function addMember(app, ownerAgent, orgId, role, email, name = role) {
  const inv = await ownerAgent.post('/api/org/invitations').set('x-org-id', orgId).send({ email, role });
  if (inv.status !== 201) throw new Error(`invite failed: ${inv.status} ${JSON.stringify(inv.body)}`);
  const token = inv.body.data.inviteLink.split('/invite/')[1];
  const { agent, user } = await signup(app, name, email);
  const acc = await agent.post(`/api/invitations/${token}/accept`);
  if (acc.status !== 200) throw new Error(`accept failed: ${acc.status} ${JSON.stringify(acc.body)}`);
  return { agent, user };
}

export const ticketPayload = (over = {}) => ({
  subject: 'Cannot log in',
  description: 'I reset my password but still cannot sign in.',
  customerName: 'Hannah Brooks',
  customerEmail: 'hannah@example.com',
  ...over,
});

/** Standard fixture: one org with owner, admin, agent, viewer. */
export async function fixture(app) {
  const owner = await signup(app, 'Olivia Owner', `owner${Date.now()}${Math.random().toString(36).slice(2, 6)}@t.test`);
  const orgId = await makeOrg(owner.agent, 'Fixture Org');
  await setPlan(orgId, 'business');
  const sfx = Math.random().toString(36).slice(2, 8);
  const admin = await addMember(app, owner.agent, orgId, 'admin', `admin-${sfx}@t.test`, 'Adam Admin');
  const agent = await addMember(app, owner.agent, orgId, 'agent', `agent-${sfx}@t.test`, 'Alice Agent');
  const viewer = await addMember(app, owner.agent, orgId, 'viewer', `viewer-${sfx}@t.test`, 'Victor Viewer');
  return { owner, admin, agent, viewer, orgId };
}
