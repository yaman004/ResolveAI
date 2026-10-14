import { z } from 'zod';
import { TICKET_PRIORITIES, TICKET_STATUSES } from '../models/Ticket.js';
import { MESSAGE_TYPES } from '../models/TicketMessage.js';
import { PLAN_IDS } from '../config/plans.js';

const objectId = z.string().regex(/^[a-f\d]{24}$/i, 'Invalid id');
const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);
const name = (label = 'Name') => z.string().trim().min(2, `${label} must be at least 2 characters`).max(80);
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[A-Za-z]/, 'Password must include a letter')
  .regex(/\d/, 'Password must include a number');

const num = (def) => z.coerce.number().int().min(1).default(def);

export const idParam = z.object({ id: objectId });
export const tokenParam = z.object({ token: z.string().min(20).max(200) });

// ----- auth -----
export const registerBody = z.object({ name: name(), email, password });
export const loginBody = z.object({ email, password: z.string().min(1, 'Password is required').max(128) });
export const profileBody = z
  .object({
    name: name().optional(),
    currentPassword: z.string().max(128).optional(),
    newPassword: password.optional(),
  })
  .refine((v) => !v.newPassword || v.currentPassword, { path: ['currentPassword'], message: 'Enter your current password to set a new one' });

// ----- organization -----
export const createOrgBody = z.object({ name: z.string().trim().min(2, 'Workspace name must be at least 2 characters').max(80) });
export const updateOrgBody = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  supportEmail: z.union([email, z.literal('')]).optional(),
  categories: z.array(z.string().trim().min(1).max(60)).min(1, 'Add at least one category').max(20).optional(),
  helpCenterEnabled: z.boolean().optional(),
});
export const memberIdParam = z.object({ id: objectId });
export const updateMemberBody = z.object({ role: z.enum(['viewer', 'agent', 'admin', 'owner']) });
export const inviteBody = z.object({ email, role: z.enum(['admin', 'agent', 'viewer']) });
export const changePlanBody = z.object({ plan: z.enum(PLAN_IDS) });

// ----- tickets -----
const subject = z.string().trim().min(3, 'Subject must be at least 3 characters').max(200);
const description = z.string().trim().min(1, 'Description is required').max(10000);
const customerName = z.string().trim().min(1, 'Customer name is required').max(120);
const category = z.string().trim().min(1).max(60);

export const createTicketBody = z.object({
  subject,
  description,
  customerName,
  customerEmail: email,
  priority: z.enum(TICKET_PRIORITIES).default('medium'),
  category: category.default('General'),
  assignee: objectId.nullish(),
});

export const updateTicketBody = z
  .object({
    subject: subject.optional(),
    description: description.optional(),
    customerName: customerName.optional(),
    customerEmail: email.optional(),
    status: z.enum(TICKET_STATUSES).optional(),
    priority: z.enum(TICKET_PRIORITIES).optional(),
    category: category.optional(),
    assignee: objectId.nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const listTicketsQuery = z.object({
  status: z.string().max(80).optional(),
  priority: z.string().max(80).optional(),
  assignee: z.string().max(40).optional(),
  category: z.string().max(60).optional(),
  q: z.string().trim().max(100).optional(),
  sort: z.enum(['createdAt', 'updatedAt', 'priority', 'number', 'status']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: num(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const createMessageBody = z.object({
  type: z.enum(MESSAGE_TYPES),
  body: z.string().trim().min(1, 'Message cannot be empty').max(10000),
  aiAssisted: z.boolean().optional(),
});

export const aiReplyBody = z.object({ articleIds: z.array(objectId).max(5).optional() });

// ----- knowledge -----
const tags = z
  .array(z.string().trim().toLowerCase().min(1).max(30))
  .max(10)
  .transform((arr) => [...new Set(arr)]);

export const createArticleBody = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(160),
  body: z.string().trim().min(10, 'Body must be at least 10 characters').max(20000),
  category: category.default('General'),
  tags: tags.default([]),
  status: z.enum(['draft', 'published']).default('draft'),
});
export const updateArticleBody = createArticleBody
  .partial()
  .refine((v) => Object.keys(v).length > 0, { message: 'Nothing to update' });

export const listArticlesQuery = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(['draft', 'published']).optional(),
  category: z.string().max(60).optional(),
  page: num(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

// ----- analytics / public -----
export const analyticsQuery = z.object({ range: z.enum(['7', '30', '90']).default('30') });
export const helpSlugParam = z.object({ slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/) });
export const helpArticleParams = z.object({ slug: z.string().min(1).max(60).regex(/^[a-z0-9-]+$/), articleId: objectId });
export const helpQuery = z.object({ q: z.string().trim().max(100).optional() });
