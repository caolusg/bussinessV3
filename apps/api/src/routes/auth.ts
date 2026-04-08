import { Router } from 'express';
import type { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { BCRYPT_ROUNDS, JWT_EXPIRES_IN, JWT_SECRET } from '../env.js';
import { requireAuth } from '../middleware/requireAuth.js';

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

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const jwtSecret: jwt.Secret = JWT_SECRET;
const jwtExpiresIn: jwt.SignOptions['expiresIn'] = '7d';

const getUserRoles = async (userId: string) => {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true }
  });
  return roles.map((r: { role: { key: string } }) => r.role.key);
};

const ensureActiveUser = (status: string) => status === 'ACTIVE';

router.post('/student/register_or_login', async (req, res) => {
  try {
    const parsed = studentAuthSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const username = parsed.data.username.trim();
    const password = parsed.data.password;

    if (parsed.data.mode === 'register') {
      const existing = await prisma.user.findUnique({ where: { username } });
      if (existing) {
        return res.status(409).json(fail('USERNAME_TAKEN', 'Username already exists'));
      }

      const role = await prisma.role.findUnique({ where: { key: 'student' } });
      if (!role) {
        return res.status(500).json(fail('ROLE_MISSING', 'Student role not initialized'));
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const created = await tx.user.create({
          data: {
            username,
            passwordHash,
            status: 'ACTIVE'
          }
        });
        await tx.userRole.create({
          data: {
            userId: created.id,
            roleId: role.id
          }
        });
        return created;
      });

      const token = jwt.sign({ userId: user.id }, jwtSecret, {
        expiresIn: jwtExpiresIn
      });
      return res.status(200).json(ok({ token }));
    }
    const existing = await prisma.user.findUnique({ where: { username } });
    if (!existing) {
      return res.status(404).json(fail('USER_NOT_FOUND', 'User not found'));
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

    const token = jwt.sign({ userId: existing.id }, jwtSecret, {
      expiresIn: jwtExpiresIn
    });
    return res.status(200).json(ok({ token }));
  } catch (error) {
    console.error('Student register/login failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/student/register', async (req, res) => {
  try {
    const parsed = studentRegisterSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const username = parsed.data.username.trim();
    const password = parsed.data.password;

    const existing = await prisma.user.findUnique({ where: { username } });
    if (existing) {
      return res.status(409).json(fail('USERNAME_TAKEN', 'Username already exists'));
    }

    const role = await prisma.role.findUnique({ where: { key: 'student' } });
    if (!role) {
      return res.status(500).json(fail('ROLE_MISSING', 'Student role not initialized'));
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const user = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          status: 'ACTIVE'
        }
      });
      await tx.userRole.create({
        data: {
          userId: created.id,
          roleId: role.id
        }
      });
      return created;
    });

    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: jwtExpiresIn
    });
    return res.status(200).json(ok({ user: { id: user.id, username: user.username }, token }));
  } catch (error) {
    console.error('Student register failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/student/login', async (req, res) => {
  try {
    const parsed = studentLoginSchema.safeParse(req.body);
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
    if (!roles.includes('student')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Student role required'));
    }

    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: jwtExpiresIn
    });
    return res.status(200).json(ok({ user: { id: user.id, username: user.username }, token }));
  } catch (error) {
    console.error('Student login failed:', error);
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

    const token = jwt.sign({ userId: user.id }, jwtSecret, {
      expiresIn: jwtExpiresIn
    });
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
