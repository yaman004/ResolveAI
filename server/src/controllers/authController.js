import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Membership } from '../models/Membership.js';
import { config } from '../config/env.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { conflict, unauthorized, badRequest } from '../utils/AppError.js';
import { clearAuthCookie, setAuthCookie } from '../utils/token.js';

let dummyHash;
const getDummyHash = () => (dummyHash ??= bcrypt.hashSync('not-a-real-password-1', config.bcryptRounds));

async function sessionPayload(user) {
  const memberships = await Membership.find({ user: user._id }).populate('organization', 'name slug').sort({ createdAt: 1 });
  return {
    user: user.toJSON(),
    memberships: memberships
      .filter((m) => m.organization)
      .map((m) => ({ id: m.id, role: m.role, organization: { id: m.organization.id, name: m.organization.name, slug: m.organization.slug } })),
  };
}

export const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;
  if (await User.exists({ email })) throw conflict('An account with this email already exists.', 'EMAIL_TAKEN');
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  const user = await User.create({ name, email, passwordHash });
  setAuthCookie(res, user._id);
  res.status(201).json({ data: await sessionPayload(user) });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+passwordHash');
  // Always run a bcrypt compare so response time does not reveal whether the email exists.
  const ok = await bcrypt.compare(password, user?.passwordHash || getDummyHash());
  if (!user || !ok) throw unauthorized('Incorrect email or password.', 'INVALID_CREDENTIALS');
  setAuthCookie(res, user._id);
  res.json({ data: await sessionPayload(user) });
});

export const logout = (_req, res) => {
  clearAuthCookie(res);
  res.json({ data: { ok: true } });
};

export const me = asyncHandler(async (req, res) => {
  res.json({ data: await sessionPayload(req.user) });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, currentPassword, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (name) user.name = name;
  if (newPassword) {
    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) throw badRequest('Your current password is incorrect.', 'INVALID_CURRENT_PASSWORD', { currentPassword: 'Incorrect password' });
    user.passwordHash = await bcrypt.hash(newPassword, config.bcryptRounds);
  }
  await user.save();
  res.json({ data: await sessionPayload(user) });
});
