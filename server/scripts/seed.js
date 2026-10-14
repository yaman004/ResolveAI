/**
 * Demo data seeder for LOCAL DEVELOPMENT ONLY.
 *   npm run seed
 * Recreates the "Acme Cloud" demo workspace (and only that workspace) using the app's own models.
 * Refuses to run when NODE_ENV=production.
 */
import bcrypt from 'bcryptjs';
import { config } from '../src/config/env.js';
import { connectDb, disconnectDb } from '../src/config/db.js';
import { User } from '../src/models/User.js';
import { Organization } from '../src/models/Organization.js';
import { Membership } from '../src/models/Membership.js';
import { Ticket } from '../src/models/Ticket.js';
import { TicketMessage } from '../src/models/TicketMessage.js';
import { KnowledgeArticle } from '../src/models/KnowledgeArticle.js';
import { Notification } from '../src/models/Notification.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Subscription } from '../src/models/Subscription.js';
import { Invitation } from '../src/models/Invitation.js';
import { currentPeriod } from '../src/services/usage.js';

if (config.isProd) {
  console.error('Refusing to seed: NODE_ENV=production. The seed script is for local development only.');
  process.exit(1);
}

const DEMO_PASSWORD = 'Demo@12345';
const DAY = 86400000;
const now = Date.now();

// Small deterministic PRNG so the dataset looks the same on every run.
let s = 42;
const rand = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];

const people = [
  { name: 'Priya Raman', email: 'owner@acme-demo.test', role: 'owner' },
  { name: 'Marcus Webb', email: 'admin@acme-demo.test', role: 'admin' },
  { name: 'Sofia Alvarez', email: 'sofia@acme-demo.test', role: 'agent' },
  { name: 'Daniel Okafor', email: 'daniel@acme-demo.test', role: 'agent' },
  { name: 'Mei Tanaka', email: 'mei@acme-demo.test', role: 'agent' },
  { name: 'Viewer Vince', email: 'viewer@acme-demo.test', role: 'viewer' },
];

const articles = [
  { title: 'How to reset your password', category: 'Account', tags: ['password', 'login', 'reset', 'account'], status: 'published', body: 'If you forgot your password, go to the sign-in page and choose "Forgot password". Enter the email address on your account and we will send a reset link that is valid for 60 minutes.\n\nIf you do not receive the email within 10 minutes, check your spam folder. Reset emails come from no-reply@acme-cloud.example. If the email still does not arrive, contact support so an agent can verify your identity and help.\n\nFor security, resetting your password signs you out of all other devices.' },
  { title: 'Refund policy', category: 'Billing', tags: ['refund', 'billing', 'cancel', 'payment'], status: 'published', body: 'Monthly plans can be refunded within 14 days of the first payment if you have not used more than 20% of the plan allowance. Annual plans can be refunded within 30 days of purchase.\n\nRefunds are returned to the original payment method and typically appear within 5 to 10 business days. Renewals are not refundable once the new billing period has started.\n\nRefund requests are approved by the billing team. Agents cannot promise a refund before the billing team has reviewed the request.' },
  { title: 'Changing or cancelling your subscription', category: 'Billing', tags: ['subscription', 'cancel', 'upgrade', 'downgrade', 'plan'], status: 'published', body: 'You can upgrade, downgrade or cancel at any time from Settings > Billing. Upgrades take effect immediately and are prorated. Downgrades and cancellations take effect at the end of the current billing period, and you keep access until then.\n\nAfter cancelling, your data is retained for 30 days in case you decide to come back. After 30 days it is permanently deleted.' },
  { title: 'Supported browsers and system requirements', category: 'Technical', tags: ['browser', 'requirements', 'chrome', 'safari', 'compatibility'], status: 'published', body: 'Acme Cloud works in the latest two versions of Chrome, Firefox, Safari and Edge. Internet Explorer is not supported.\n\nIf the dashboard fails to load, try clearing your browser cache, disabling extensions, or opening a private window. If the problem continues, send us a screenshot of the browser console and the time the problem occurred.' },
  { title: 'Setting up single sign-on (SSO)', category: 'Account', tags: ['sso', 'saml', 'security', 'login'], status: 'published', body: 'Single sign-on with SAML 2.0 is available on the Business plan. An admin can configure it under Settings > Security > SSO by uploading the metadata XML from your identity provider.\n\nAfter configuration, test with a single user before enforcing SSO for the whole workspace. Enforcing SSO does not remove the ability of the workspace owner to sign in with a password as a recovery option.' },
  { title: 'Data export and deletion requests', category: 'Account', tags: ['export', 'gdpr', 'privacy', 'delete', 'data'], status: 'published', body: 'Workspace owners can export all workspace data as a ZIP of CSV files from Settings > Data. Exports are prepared within a few minutes and the download link is valid for 24 hours.\n\nTo delete your account and data, the workspace owner must submit a deletion request to support. Deletion is completed within 30 days.' },
  { title: 'API rate limits', category: 'Technical', tags: ['api', 'rate limit', 'developer', '429'], status: 'published', body: 'The API allows 100 requests per minute per API key on the Pro plan and 1,000 per minute on Business. Requests over the limit receive HTTP 429 with a Retry-After header.\n\nIf you regularly need higher limits, contact support with your use case so we can review it.' },
  { title: 'Internal: escalation guide for outages (draft)', category: 'Technical', tags: ['outage', 'incident', 'escalation'], status: 'draft', body: 'Draft for internal review. When more than three customers report the same failure, page the on-call engineer and post in the incident channel before replying to customers.' },
];

const subjects = [
  ['Cannot log in after password reset', 'Account'], ['Reset email never arrived', 'Account'], ['Request a refund for last month', 'Billing'],
  ['How do I cancel my subscription?', 'Billing'], ['Dashboard will not load in Safari', 'Technical'], ['API returns 429 errors', 'Technical'],
  ['Need SSO for our team', 'Account'], ['Export all of our data', 'Account'], ['Charged twice this month', 'Billing'],
  ['Upgrade to Business plan', 'Billing'], ['Feature request: dark mode', 'Feature request'], ['Slow performance on reports page', 'Technical'],
  ['Invoice needs company address', 'Billing'], ['Delete our account', 'Account'], ['Webhook not firing', 'Technical'],
  ['Where can I find my API key?', 'Technical'], ['Add more seats to our plan', 'Billing'], ['Two-factor authentication question', 'Account'],
];
const customers = [
  ['Hannah Brooks', 'hannah@brightpath.example'], ['Omar Haddad', 'omar@northwind.example'], ['Lena Fischer', 'lena@fischer-co.example'],
  ['Tomás Rivera', 'tomas@riveralabs.example'], ['Aisha Khan', 'aisha@lumen.example'], ['Ben Carter', 'ben@carterworks.example'],
  ['Chloe Dubois', 'chloe@atelier.example'], ['Ravi Patel', 'ravi@patelsoft.example'], ['Grace Liu', 'grace@orchid.example'],
];
const agentReplies = [
  'Thanks for reaching out. I have looked into this and here is what I found. Let me know if that resolves it.',
  'Hi again, I have escalated this to the relevant team and will update you as soon as I hear back.',
  'Good news: this has been fixed on our side. Could you try again and confirm it works for you?',
];

async function run() {
  await connectDb();
  const existing = await Organization.findOne({ slug: 'acme-cloud' });
  if (existing) {
    const id = existing._id;
    await Promise.all([Ticket, TicketMessage, KnowledgeArticle, Notification, AuditLog, Subscription, Invitation, Membership].map((M) => M.deleteMany({ organization: id })));
    await existing.deleteOne();
  }
  const hash = await bcrypt.hash(DEMO_PASSWORD, config.bcryptRounds);
  const users = [];
  for (const p of people) {
    let u = await User.findOne({ email: p.email });
    if (!u) u = await User.create({ name: p.name, email: p.email, passwordHash: hash });
    else { u.passwordHash = hash; await u.save(); }
    users.push({ ...p, doc: u });
  }
  const owner = users[0].doc;
  const org = await Organization.create({ name: 'Acme Cloud', slug: 'acme-cloud', createdBy: owner._id, settings: { supportEmail: 'support@acme-cloud.example' } });
  await Membership.insertMany(users.map((u) => ({ user: u.doc._id, organization: org._id, role: u.role })));
  await Subscription.create({ organization: org._id, plan: 'pro', usagePeriod: currentPeriod(), aiRepliesUsed: 0 });
  await KnowledgeArticle.insertMany(articles.map((a, i) => ({ ...a, organization: org._id, author: owner._id, updatedBy: owner._id, publishedAt: a.status === 'published' ? new Date(now - (20 - i) * DAY) : null, createdAt: new Date(now - (25 - i) * DAY), updatedAt: new Date(now - (20 - i) * DAY) })), { timestamps: false });

  const agents = users.filter((u) => ['owner', 'admin', 'agent'].includes(u.role)).map((u) => u.doc);
  const statuses = ['open', 'open', 'in_progress', 'in_progress', 'waiting', 'resolved', 'resolved', 'resolved', 'resolved'];
  const priorities = ['low', 'medium', 'medium', 'medium', 'high', 'high', 'urgent'];
  const total = 64;
  const tickets = [];
  const messages = [];
  const audits = [];
  for (let n = 1; n <= total; n += 1) {
    const ageDays = Math.floor((1 - Math.pow(n / total, 0.8)) * 44 + rand() * 1.5); // newer tickets have higher numbers
    const created = new Date(now - ageDays * DAY - Math.floor(rand() * DAY * 0.8));
    const [subject, category] = pick(subjects);
    const [customerName, customerEmail] = pick(customers);
    let status = pick(statuses);
    if (ageDays > 20 && rand() < 0.8) status = 'resolved';
    if (ageDays < 2 && status === 'resolved') status = 'open';
    const assignee = rand() < 0.85 ? pick(agents) : null;
    const resolvedAt = status === 'resolved' ? new Date(Math.min(now - 60000, created.getTime() + (0.2 + rand() * 3) * DAY)) : null;
    const ticket = {
      organization: org._id, number: n, subject, category, customerName, customerEmail, status,
      priority: pick(priorities), assignee, createdBy: owner._id, resolvedAt,
      description: `Hi team, ${subject.toLowerCase()}. This has been affecting our work since yesterday and we would appreciate some help. Thanks, ${customerName.split(' ')[0]}`,
      createdAt: created, updatedAt: resolvedAt || created, lastMessageAt: created,
    };
    tickets.push(ticket);
    audits.push({ organization: org._id, actor: owner._id, action: 'ticket.created', entityType: 'ticket', summary: `${owner.name} created #${n} “${subject}”`, createdAt: created });
  }
  const created = await Ticket.insertMany(tickets, { timestamps: false });
  for (const t of created) {
    if (t.status !== 'open' && t.assignee) {
      const at = new Date(t.createdAt.getTime() + 3600000);
      messages.push({ organization: org._id, ticket: t._id, type: 'reply', author: t.assignee, body: pick(agentReplies), createdAt: at, updatedAt: at });
      if (t.status === 'waiting') {
        const c2 = new Date(at.getTime() + 7200000);
        messages.push({ organization: org._id, ticket: t._id, type: 'customer', author: null, body: 'Thanks, I tried that but I am still seeing the problem. Any other ideas?', createdAt: c2, updatedAt: c2 });
      }
      if (t.status === 'in_progress') {
        const n2 = new Date(at.getTime() + 1800000);
        messages.push({ organization: org._id, ticket: t._id, type: 'note', author: t.assignee, body: 'Checked the account logs. Waiting on engineering to confirm root cause.', createdAt: n2, updatedAt: n2 });
      }
    }
  }
  await TicketMessage.insertMany(messages, { timestamps: false });
  await AuditLog.insertMany(audits.slice(-8), { timestamps: false });
  await Notification.insertMany([
    { organization: org._id, user: owner._id, type: 'ticket_assigned', title: 'Welcome to the Acme Cloud demo workspace', body: 'Explore the inbox, knowledge base and analytics.', link: '/app/inbox' },
  ]);
  const counts = { tickets: total, messages: messages.length, articles: articles.length };
  await Organization.updateOne({ _id: org._id }, { $set: { ticketCounter: total } });

  console.log('\nSeeded demo workspace "Acme Cloud" (local development only)');
  console.log(counts);
  console.log(`\nSign in at http://localhost:5173/login  (password for all demo users: ${DEMO_PASSWORD})`);
  for (const p of people) console.log(`  ${p.role.padEnd(7)} ${p.email}`);
  console.log(`\nPublic help center: http://localhost:5173/help/acme-cloud\n`);
  await disconnectDb();
}

run().catch(async (err) => {
  console.error('Seed failed:', err);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
