// Single source of truth for plan definitions and limits.
export const PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    priceMonthly: 0,
    description: 'For small teams trying out ResolveAI.',
    limits: { members: 3, aiRepliesPerMonth: 25 },
    features: ['Up to 3 team members', '25 AI-assisted replies per month', 'Unlimited tickets', 'Knowledge base and public help center'],
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceMonthly: 29,
    description: 'For growing support teams.',
    limits: { members: 15, aiRepliesPerMonth: 500 },
    features: ['Up to 15 team members', '500 AI-assisted replies per month', 'Everything in Free', 'Analytics with 90-day range'],
  },
  business: {
    id: 'business',
    name: 'Business',
    priceMonthly: 99,
    description: 'For larger organizations with high volume.',
    limits: { members: 100, aiRepliesPerMonth: 5000 },
    features: ['Up to 100 team members', '5,000 AI-assisted replies per month', 'Everything in Pro', 'Priority onboarding'],
  },
};

export const PLAN_IDS = Object.keys(PLANS);
export const getPlan = (id) => PLANS[id] || PLANS.free;
