import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// The .env file lives in the repository root.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const emptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '' ? undefined : v);

const schema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(5000),
    MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
    JWT_EXPIRES_DAYS: z.coerce.number().int().min(1).max(90).default(7),
    CLIENT_URL: z.string().url().default('http://localhost:5173'),
    COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).default('lax'),
    BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
    AI_API_KEY: z.preprocess(emptyToUndefined, z.string().optional()),
    AI_BASE_URL: z.preprocess(emptyToUndefined, z.string().url().default('https://api.openai.com/v1')),
    AI_MODEL: z.preprocess(emptyToUndefined, z.string().default('gpt-4o-mini')),
    AI_TIMEOUT_MS: z.preprocess(emptyToUndefined, z.coerce.number().int().min(1000).default(25000)),
    ALLOW_PLAN_SWITCH_WITHOUT_PAYMENT: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).optional()),
    SERVE_CLIENT: z.preprocess(emptyToUndefined, z.enum(['true', 'false']).default('false')),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
      ctx.addIssue({ code: 'custom', path: ['JWT_SECRET'], message: 'JWT_SECRET must be at least 32 characters in production' });
    }
  });

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const lines = parsed.error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`);
  console.error(`\nInvalid environment configuration:\n${lines.join('\n')}\n\nCopy .env.example to .env and fill in the values.\n`);
  process.exit(1);
}

const e = parsed.data;

// A plain mutable object so tests can adjust AI settings at runtime.
export const config = {
  env: e.NODE_ENV,
  isProd: e.NODE_ENV === 'production',
  isTest: e.NODE_ENV === 'test',
  port: e.PORT,
  mongoUri: e.MONGODB_URI,
  jwtSecret: e.JWT_SECRET,
  jwtExpiresDays: e.JWT_EXPIRES_DAYS,
  clientUrl: e.CLIENT_URL.replace(/\/$/, ''),
  cookieSameSite: e.COOKIE_SAMESITE,
  bcryptRounds: e.BCRYPT_ROUNDS,
  serveClient: e.SERVE_CLIENT === 'true',
  allowPlanSwitch:
    e.ALLOW_PLAN_SWITCH_WITHOUT_PAYMENT !== undefined
      ? e.ALLOW_PLAN_SWITCH_WITHOUT_PAYMENT === 'true'
      : e.NODE_ENV !== 'production',
  ai: {
    apiKey: e.AI_API_KEY,
    baseUrl: e.AI_BASE_URL.replace(/\/$/, ''),
    model: e.AI_MODEL,
    timeoutMs: e.AI_TIMEOUT_MS,
  },
};
