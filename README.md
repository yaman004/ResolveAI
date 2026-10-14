# ResolveAI

AI-assisted customer support and helpdesk platform. MERN stack (MongoDB, Express, React + Vite, Node), Tailwind CSS, Mongoose, JWT cookie auth.

> **Status: development MVP.** It is *not* production-ready. See [Security notes and limitations](#security-notes-and-limitations) before any real customer use.

## What's included

- **Auth and workspaces**: register, log in/out, httpOnly-cookie sessions, profile + password change, onboarding that creates a workspace, workspace switcher for users in several organizations.
- **Roles** (enforced on the server): Owner, Admin, Agent, Viewer.
- **Multi-tenancy**: every tenant record carries an `organization` id. The active organization comes from the `X-Org-Id` header, but the server only honours it after finding a `Membership` for the authenticated user. Every query is filtered by that verified organization, so IDs from another workspace behave as "not found".
- **Tickets**: create, edit, assign, status/priority/category, internal notes, customer-facing replies, logged customer messages, search, filter tabs, sorting, pagination, stats, customer history.
- **AI reply assistant**: retrieves the organization's published articles (or the ones the agent selects), calls a server-side OpenAI-compatible API, returns a *draft* with a confidence label, sources and an internal escalation note. Never auto-sent. Handles missing key, timeout, rate limit, bad key, provider errors and monthly plan limits.
- **Knowledge base**: articles with draft/published states, tags, categories, search, role-based editing, and a public help center at `/help/:workspace-slug` (published articles only).
- **Analytics**: totals, volume over time, status/priority mix, agent workload, average resolution time, recent activity, all computed from real records. Empty workspaces show empty states.
- **Team**: member list, role changes, removal, invitations via secure one-time token, in-app notifications, audit log.
- **Plans**: Free / Pro / Business with server-enforced member and monthly AI-reply limits and a billing-ready `Subscription` model.

## Project structure

```
resolveai/
  client/                 React + Vite + Tailwind
    src/
      components/         ui kit (buttons, modals, badges...), route guards
      context/            AuthContext, ToastContext
      features/           PricingCards, ProductPreview, TicketForm
      hooks/              useFetch, useDebounced
      layouts/            PublicLayout, AppLayout
      pages/              Landing, Pricing, Login/Register, HelpCenter, Onboarding,
                          Dashboard, Inbox, TicketDetail, Knowledge, Analytics,
                          Team, Settings, Billing, AcceptInvite, NotFound
      services/api.js     axios instance (cookies + X-Org-Id)
      utils/format.js
  server/
    src/
      config/             env validation (zod), db, plans
      models/             User, Organization, Membership, Invitation, Ticket, TicketMessage,
                          KnowledgeArticle, Notification, AuditLog, Subscription
      middleware/         auth, tenant (membership + role), validate, rate limits, error handler
      validators/         zod schemas
      services/           aiService, knowledge ranking, usage/limits, audit, notify
      controllers/ routes/
    scripts/seed.js       demo data (local dev only)
    tests/                vitest + supertest + mongodb-memory-server
  .env.example
  package.json            npm workspaces + root scripts
```

## Quick start

Requirements: Node.js 20+, npm 9+, and MongoDB (local, Docker, or Atlas).

```bash
# 1. Install (installs client and server workspaces)
npm install

# 2. Configure
cp .env.example .env
#   - set JWT_SECRET (see the command in .env.example)
#   - set MONGODB_URI (default: mongodb://127.0.0.1:27017/resolveai)
#   - optional: AI_API_KEY to enable AI drafts

# 3. (Optional) start MongoDB locally with Docker
docker run -d --name resolveai-mongo -p 27017:27017 mongo:7

# 4. (Optional) load demo data
npm run seed

# 5. Run API (http://localhost:5000) and web app (http://localhost:5173)
npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` to Express so the auth cookie is same-origin.

### Demo data (local development only)

`npm run seed` creates the **Acme Cloud** workspace (slug `acme-cloud`) with 64 tickets over ~45 days, replies/notes, 8 articles (7 published, 1 draft) and a Pro plan. It refuses to run when `NODE_ENV=production` and only recreates that one workspace.

| Role   | Email                    | Password     |
| ------ | ------------------------ | ------------ |
| Owner  | owner@acme-demo.test     | Demo@12345   |
| Admin  | admin@acme-demo.test     | Demo@12345   |
| Agent  | sofia@acme-demo.test     | Demo@12345   |
| Agent  | daniel@acme-demo.test    | Demo@12345   |
| Agent  | mei@acme-demo.test       | Demo@12345   |
| Viewer | viewer@acme-demo.test    | Demo@12345   |

Public help center for the demo: http://localhost:5173/help/acme-cloud

These credentials are for local development only. Never seed or use them in a shared or production environment.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes | Long random string (32+ chars required in production) |
| `CLIENT_URL` | no | Web app origin for CORS and invitation links (default `http://localhost:5173`) |
| `PORT` | no | API port (default 5000; if you change it, update the proxy in `client/vite.config.js`) |
| `COOKIE_SAMESITE` | no | `lax` (default). Use `none` only when client and API are on different sites over HTTPS |
| `AI_API_KEY` | no | Enables AI drafts. Leave empty to run without AI |
| `AI_MODEL` | no | Default `gpt-4o-mini` |
| `AI_BASE_URL` | no | Default `https://api.openai.com/v1`. Any OpenAI-compatible `/chat/completions` API works |
| `AI_TIMEOUT_MS` | no | Default 25000 |
| `ALLOW_PLAN_SWITCH_WITHOUT_PAYMENT` | no | Lets an Owner change plans without payment. Defaults to true in development and false in production |
| `SERVE_CLIENT` | no | `true` to serve `client/dist` from Express after `npm run build` |

The server validates these at startup and exits with a readable message if something is wrong.

## AI behaviour and the no-key fallback

- The key lives only on the server. The browser never sees it.
- Retrieval: published articles for that organization only, ranked by weighted keyword match (title > tags > category > body). Agents can instead pick up to 5 articles by hand. No vector database in this version.
- The system prompt restricts the model to the supplied articles, tells it to acknowledge gaps instead of guessing, and treats ticket text as untrusted data. The model returns JSON (`reply`, `confidence`, `escalationNote`); non-JSON output is handled and labelled "review carefully".
- Prompt-based grounding reduces but does not eliminate wrong or invented answers. That is why every draft needs agent review before sending.
- Without `AI_API_KEY`, the API returns `503 AI_NOT_CONFIGURED`, the UI shows a setup message, and nothing is faked. Failed generations are refunded from the monthly counter.

## Invitations and email

No email provider is integrated. Creating an invitation returns a one-time link (shown once) for an admin to share manually. Only the invited email address can accept it; links expire after 7 days. Tokens are stored hashed. To add email, send `inviteLink` from `createInvitation` in `server/src/controllers/orgController.js` through your provider (Postmark, SES, Resend...) and change `emailDelivery` accordingly.

## Billing

No payment provider is connected, so no payments are processed. Plan limits (members, AI replies/month) are enforced server-side. In development an Owner can switch plans for evaluation. To enable real billing: create Stripe (or similar) products matching `server/src/config/plans.js`, add a checkout/portal endpoint, handle provider webhooks to update `Subscription.plan/status/currentPeriodEnd` and the `provider*` fields, then set `ALLOW_PLAN_SWITCH_WITHOUT_PAYMENT=false`.

## Testing

```bash
npm test
```

Runs vitest + supertest against an in-memory MongoDB (`mongodb-memory-server` downloads a MongoDB binary on first run, so it needs internet access once). Coverage: registration/login/sessions, protected endpoints, membership checks, cross-tenant ticket/article/AI/notification isolation, role-based authorization and owner protection, ticket lifecycle and mass-assignment protection, filtering/pagination/stats, analytics, knowledge base access and public help center, AI grounding and every provider failure mode, plan limits.

There are no frontend automated tests yet.

## Production build

```bash
npm run build                 # builds client/dist
NODE_ENV=production SERVE_CLIENT=true npm start
```

## API overview

All routes are under `/api`. Tenant routes need the cookie session and `X-Org-Id`.

| Area | Endpoints |
| --- | --- |
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`, `GET /auth/me`, `PATCH /auth/profile` |
| Workspaces | `GET/POST /orgs`; `GET/PATCH /org` |
| Team | `GET /org/members`, `PATCH/DELETE /org/members/:id`, `GET/POST /org/invitations`, `DELETE /org/invitations/:id`, `GET /invitations/:token`, `POST /invitations/:token/accept` |
| Tickets | `GET/POST /tickets`, `GET /tickets/stats`, `GET/PATCH/DELETE /tickets/:id`, `POST /tickets/:id/messages`, `POST /tickets/:id/ai-reply` |
| Knowledge | `GET/POST /knowledge`, `GET/PATCH/DELETE /knowledge/:id` |
| Other | `GET /analytics?range=7\|30\|90`, `GET /notifications`, `PATCH /notifications/:id/read`, `POST /notifications/read-all`, `GET /ai/status`, `GET /org/billing`, `PATCH /org/billing/plan` |
| Public | `GET /public/plans`, `GET /public/help/:slug`, `GET /public/help/:slug/articles/:id` |

Responses use `{ data, meta? }` on success and `{ error: { message, code, details? } }` on failure.

Minimum roles: viewer reads; agent creates/edits tickets, replies, edits articles, uses AI; admin deletes tickets/articles, manages members, invitations and workspace settings; owner changes plans. Only the owner can grant or change the admin role; the owner role cannot be changed or removed.

## Security notes and limitations

Implemented: bcrypt password hashing (via `bcryptjs`), httpOnly SameSite cookies (Secure in production), zod validation with unknown-key stripping, membership + role checks on every tenant route, organization-scoped queries, login/AI/global rate limiting, helmet, CORS restricted to `CLIENT_URL`, generic 500 errors, pagination caps, regex escaping in search, audit log.

Known gaps to address before real customers:

- No email verification, password reset flow, MFA, or account lockout.
- No dedicated CSRF token. Protection relies on `SameSite=Lax` cookies, a restricted CORS origin and JSON-only bodies. Review this if you serve client and API from different sites.
- Rate limiting is in-process memory; use a shared store (Redis) behind multiple instances.
- JWTs are not revocable server-side (7-day expiry); logout only clears the cookie.
- Ticket intake is manual: there is no inbound email, webhook or customer portal, and replies are recorded but not emailed to customers.
- Analytics bucket days in UTC.
- Ticket numbers use an atomic counter, but no soft-delete or data-retention policy exists.
- Ownership transfer, email change and workspace deletion are not implemented.
- No file attachments.
- Needs a professional security review, load testing, backups and monitoring first.

## Troubleshooting

- **`Invalid environment configuration`** on start: copy `.env.example` to `.env` (in the repo root) and fill in `MONGODB_URI` and `JWT_SECRET`.
- **`could not connect to MongoDB`**: start MongoDB (see Docker command above) or use an Atlas URI and allow your IP.
- **Login works but the app logs you out / 401s**: use `http://localhost:5173` (not the API port) so the cookie is same-origin through the Vite proxy.
- **`Cannot reach the server`** in the UI: the API is not running, or `PORT` differs from the proxy target in `client/vite.config.js`.
- **403 `NOT_A_MEMBER`**: the stored workspace id is stale; sign out and in, or switch workspace.
- **AI panel says not configured**: set `AI_API_KEY` and restart the server.
- **Tests hang on first run**: `mongodb-memory-server` is downloading MongoDB; it needs network access once.
- **Seed says "Refusing to seed"**: `NODE_ENV` is `production`.
