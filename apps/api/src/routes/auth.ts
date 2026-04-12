import { createHash, randomBytes } from 'node:crypto';
import { Router } from 'express';
import type { Prisma, User } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import {
  APP_BASE_URL,
  BCRYPT_ROUNDS,
  EMAIL_VERIFICATION_EXPIRES_HOURS,
  EMAIL_VERIFICATION_REQUIRED,
  JWT_EXPIRES_IN,
  JWT_SECRET,
  PASSWORD_RESET_EXPIRES_MINUTES
} from '../env.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../services/authMailService.js';

const router = Router();

const studentLoginSchema = z.object({
  mode: z.literal('login').optional(),
  username: z.string().min(1),
  password: z.string().min(6)
});

const studentRegisterSchema = z
  .object({
    mode: z.literal('register').optional(),
    username: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match'
      });
    }
  });

const studentAuthSchema = z.union([studentLoginSchema, studentRegisterSchema]);

const teacherLoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(6)
});

const verifyEmailSchema = z.object({
  token: z.string().min(1)
});

const resendVerificationSchema = z.object({
  identifier: z.string().min(1)
});

const forgotPasswordSchema = z.object({
  identifier: z.string().min(1)
});

const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .superRefine((data, ctx) => {
    if (data.password !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match'
      });
    }
  });

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const jwtSecret: jwt.Secret = JWT_SECRET;
const jwtExpiresIn = JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'];
const ACCOUNT_STATUS_ACTIVE = 'ACTIVE';
const ACCOUNT_STATUS_PENDING = 'PENDING_VERIFICATION';
const GENERIC_PASSWORD_RESET_MESSAGE =
  '如果账号存在且邮箱已验证，系统会向注册邮箱发送用户名和重置密码链接';

const getUserRoles = async (userId: string) => {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true }
  });
  return roles.map((r: { role: { key: string } }) => r.role.key);
};

const ensureActiveUser = (status: string) => status === ACCOUNT_STATUS_ACTIVE;

const normalizeUsername = (username: string) => username.trim();
const normalizeEmail = (email: string) => email.trim().toLowerCase();
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');
const makeToken = () => randomBytes(32).toString('hex');
const buildUrl = (path: string, token: string) =>
  `${APP_BASE_URL.replace(/\/$/, '')}${path}?token=${encodeURIComponent(token)}`;
const shouldBlockUnverifiedLogin = (user: Pick<User, 'status' | 'emailVerifiedAt'>) =>
  EMAIL_VERIFICATION_REQUIRED &&
  (user.status === ACCOUNT_STATUS_PENDING || !user.emailVerifiedAt);

const findUserByIdentifier = async (identifier: string) => {
  const normalized = identifier.trim();
  const email = normalized.toLowerCase();

  return prisma.user.findFirst({
    where: {
      OR: [{ username: normalized }, { email }]
    }
  });
};

const issueAuthToken = (userId: string) =>
  jwt.sign({ userId }, jwtSecret, {
    expiresIn: jwtExpiresIn
  });

const createVerificationToken = async (tx: Prisma.TransactionClient, userId: string) => {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRES_HOURS * 60 * 60 * 1000);

  await tx.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  return token;
};

const createPasswordResetToken = async (tx: Prisma.TransactionClient, userId: string) => {
  const token = makeToken();
  const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRES_MINUTES * 60 * 1000);

  await tx.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt
    }
  });

  return token;
};

const createStudentAccount = async ({
  username,
  email,
  password
}: {
  username: string;
  email: string;
  password: string;
}) => {
  const role = await prisma.role.findUnique({ where: { key: 'student' } });
  if (!role) {
    throw new Error('ROLE_MISSING');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const created = await tx.user.create({
      data: {
        username,
        email,
        passwordHash,
        status: EMAIL_VERIFICATION_REQUIRED ? ACCOUNT_STATUS_PENDING : ACCOUNT_STATUS_ACTIVE,
        emailVerifiedAt: EMAIL_VERIFICATION_REQUIRED ? undefined : new Date()
      }
    });

    await tx.userRole.create({
      data: {
        userId: created.id,
        roleId: role.id
      }
    });

    const verificationToken = await createVerificationToken(tx, created.id);
    return { user: created, verificationToken };
  });
};

const sendVerificationForUser = async (user: Pick<User, 'id' | 'username' | 'email'>) => {
  if (!user.email) {
    throw new Error('EMAIL_MISSING');
  }

  const verificationToken = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    return createVerificationToken(tx, user.id);
  });

  return sendVerificationEmail({
    email: user.email,
    username: user.username,
    verificationUrl: buildUrl('/verify-email', verificationToken)
  });
};

const sendPasswordResetForUser = async (user: Pick<User, 'id' | 'username' | 'email'>) => {
  if (!user.email) {
    throw new Error('EMAIL_MISSING');
  }

  const resetToken = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() }
    });

    return createPasswordResetToken(tx, user.id);
  });

  return sendPasswordResetEmail({
    email: user.email,
    username: user.username,
    resetUrl: buildUrl('/reset-password', resetToken)
  });
};

router.post('/student/register_or_login', async (req, res) => {
  try {
    const parsed = studentAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    if (parsed.data.mode === 'register') {
      const username = normalizeUsername(parsed.data.username);
      const email = normalizeEmail(parsed.data.email);
      const password = parsed.data.password;

      const [existingUsername, existingEmail] = await Promise.all([
        prisma.user.findUnique({ where: { username } }),
        prisma.user.findUnique({ where: { email } })
      ]);

      if (existingUsername) {
        return res.status(409).json(fail('USERNAME_TAKEN', 'Username already exists'));
      }
      if (existingEmail) {
        return res.status(409).json(fail('EMAIL_TAKEN', 'Email already exists'));
      }

      const created = await createStudentAccount({ username, email, password });
      const delivery = await sendVerificationEmail({
        email,
        username,
        verificationUrl: buildUrl('/verify-email', created.verificationToken)
      });

      return res.status(200).json(
        ok({
          user: { id: created.user.id, username: created.user.username, email: created.user.email },
          verificationRequired: EMAIL_VERIFICATION_REQUIRED,
          token: EMAIL_VERIFICATION_REQUIRED ? undefined : issueAuthToken(created.user.id),
          delivery
        })
      );
    }

    const username = normalizeUsername(parsed.data.username);
    const password = parsed.data.password;
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      return res.status(404).json(fail('USER_NOT_FOUND', 'User not found'));
    }

    if (shouldBlockUnverifiedLogin(existing)) {
      return res.status(403).json(fail('EMAIL_NOT_VERIFIED', 'Email verification required'));
    }

    if (!ensureActiveUser(existing.status)) {
      return res.status(403).json(fail('ACCOUNT_DISABLED', 'Account disabled'));
    }

    const match = await bcrypt.compare(password, existing.passwordHash);
    if (!match) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const roles = await getUserRoles(existing.id);
    if (!roles.includes('student')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Student role required'));
    }

    const token = issueAuthToken(existing.id);
    return res.status(200).json(ok({ token }));
  } catch (error) {
    console.error('Student register/login failed:', error);
    if (error instanceof Error && error.message === 'ROLE_MISSING') {
      return res.status(500).json(fail('ROLE_MISSING', 'Student role not initialized'));
    }
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/student/register', async (req, res) => {
  try {
    const parsed = studentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const username = normalizeUsername(parsed.data.username);
    const email = normalizeEmail(parsed.data.email);
    const password = parsed.data.password;

    const [existingUsername, existingEmail] = await Promise.all([
      prisma.user.findUnique({ where: { username } }),
      prisma.user.findUnique({ where: { email } })
    ]);

    if (existingUsername) {
      return res.status(409).json(fail('USERNAME_TAKEN', 'Username already exists'));
    }

    if (existingEmail) {
      return res.status(409).json(fail('EMAIL_TAKEN', 'Email already exists'));
    }

    const created = await createStudentAccount({ username, email, password });
    const delivery = await sendVerificationEmail({
      email,
      username,
      verificationUrl: buildUrl('/verify-email', created.verificationToken)
    });

    return res.status(200).json(
      ok({
        user: { id: created.user.id, username: created.user.username, email: created.user.email },
        verificationRequired: EMAIL_VERIFICATION_REQUIRED,
        token: EMAIL_VERIFICATION_REQUIRED ? undefined : issueAuthToken(created.user.id),
        delivery
      })
    );
  } catch (error) {
    console.error('Student register failed:', error);
    if (error instanceof Error && error.message === 'ROLE_MISSING') {
      return res.status(500).json(fail('ROLE_MISSING', 'Student role not initialized'));
    }
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const parsed = studentLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const username = normalizeUsername(parsed.data.username);
    const password = parsed.data.password;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    if (shouldBlockUnverifiedLogin(user)) {
      return res.status(403).json(fail('EMAIL_NOT_VERIFIED', 'Email verification required'));
    }

    if (!ensureActiveUser(user.status)) {
      return res.status(403).json(fail('ACCOUNT_DISABLED', 'Account disabled'));
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const roles = await getUserRoles(user.id);
    if (!roles.includes('student')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Student role required'));
    }

    const token = issueAuthToken(user.id);
    return res.status(200).json(ok({ user: { id: user.id, username: user.username }, token }));
  } catch (error) {
    console.error('Student login failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/verify-email', async (req, res) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const tokenHash = hashToken(parsed.data.token);
    const verificationToken = await prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !verificationToken ||
      verificationToken.usedAt ||
      verificationToken.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json(fail('INVALID_OR_EXPIRED_TOKEN', 'Invalid or expired token'));
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.emailVerificationToken.update({
        where: { id: verificationToken.id },
        data: { usedAt: new Date() }
      });

      await tx.emailVerificationToken.updateMany({
        where: {
          userId: verificationToken.userId,
          usedAt: null,
          id: { not: verificationToken.id }
        },
        data: { usedAt: new Date() }
      });

      await tx.user.update({
        where: { id: verificationToken.userId },
        data: {
          emailVerifiedAt: new Date(),
          status: ACCOUNT_STATUS_ACTIVE
        }
      });
    });

    return res.status(200).json(
      ok({
        verified: true,
        username: verificationToken.user.username,
        email: verificationToken.user.email
      })
    );
  } catch (error) {
    console.error('Verify email failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/resend-verification', async (req, res) => {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const user = await findUserByIdentifier(parsed.data.identifier);
    if (!user) {
      return res.status(200).json(ok({ sent: true }));
    }

    const roles = await getUserRoles(user.id);
    if (!roles.includes('student')) {
      return res.status(200).json(ok({ sent: true }));
    }

    if (user.emailVerifiedAt) {
      return res.status(200).json(ok({ sent: true, alreadyVerified: true }));
    }

    const delivery = await sendVerificationForUser(user);
    return res.status(200).json(ok({ sent: true, delivery }));
  } catch (error) {
    console.error('Resend verification failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/forgot-password', async (req, res) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const user = await findUserByIdentifier(parsed.data.identifier);
    if (!user) {
      return res.status(200).json(ok({ message: GENERIC_PASSWORD_RESET_MESSAGE }));
    }

    const roles = await getUserRoles(user.id);
    if (!roles.includes('student') || !user.email || !user.emailVerifiedAt) {
      return res.status(200).json(ok({ message: GENERIC_PASSWORD_RESET_MESSAGE }));
    }

    const delivery = await sendPasswordResetForUser(user);
    return res.status(200).json(
      ok({
        message: GENERIC_PASSWORD_RESET_MESSAGE,
        delivery
      })
    );
  } catch (error) {
    console.error('Forgot password failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/reset-password', async (req, res) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const tokenHash = hashToken(parsed.data.token);
    const passwordResetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true }
    });

    if (
      !passwordResetToken ||
      passwordResetToken.usedAt ||
      passwordResetToken.expiresAt.getTime() <= Date.now()
    ) {
      return res.status(400).json(fail('INVALID_OR_EXPIRED_TOKEN', 'Invalid or expired token'));
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_ROUNDS);

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.passwordResetToken.update({
        where: { id: passwordResetToken.id },
        data: { usedAt: new Date() }
      });

      await tx.passwordResetToken.updateMany({
        where: {
          userId: passwordResetToken.userId,
          usedAt: null,
          id: { not: passwordResetToken.id }
        },
        data: { usedAt: new Date() }
      });

      await tx.user.update({
        where: { id: passwordResetToken.userId },
        data: { passwordHash }
      });
    });

    return res.status(200).json(
      ok({
        reset: true,
        username: passwordResetToken.user.username
      })
    );
  } catch (error) {
    console.error('Reset password failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/teacher/login', async (req, res) => {
  try {
    const parsed = teacherLoginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const username = parsed.data.username.trim();
    const password = parsed.data.password;

    const user = await prisma.user.findUnique({ where: { username } });
    if (!user) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    if (!ensureActiveUser(user.status)) {
      return res.status(403).json(fail('ACCOUNT_DISABLED', 'Account disabled'));
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const roles = await getUserRoles(user.id);
    if (!roles.includes('teacher')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Teacher role required'));
    }

    const token = issueAuthToken(user.id);
    return res.status(200).json(ok({ token }));
  } catch (error) {
    console.error('Teacher login failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
        createdAt: true
      }
    });
    if (!user) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const roles = await getUserRoles(userId);
    let profileCompleted = true;
    if (roles.includes('student')) {
      const profile = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { completedAt: true }
      });
      profileCompleted = Boolean(profile?.completedAt);
    }

    return res.status(200).json(ok({ user, roles, profileCompleted }));
  } catch (error) {
    console.error('Get me failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
