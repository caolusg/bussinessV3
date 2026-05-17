import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { BCRYPT_ROUNDS } from '../env.js';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const profileSchema = z.object({
  realName: z.string().trim().min(1),
  studentNo: z.string().trim().min(1),
  nationality: z.string().trim().min(1),
  age: z.number().int().positive(),
  gender: z.string().trim().min(1),
  hskLevel: z.string().trim().min(1),
  major: z.string().trim().min(1)
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6),
    confirmPassword: z.string().min(6)
  })
  .superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['confirmPassword'],
        message: 'Passwords do not match'
      });
    }
  });

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const getRoles = async (userId: string) => {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true }
  });
  return roles.map((r: { role: { key: string } }) => r.role.key);
};

router.get('/student', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const roles = await getRoles(userId);
    if (!roles.includes('student')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Student role required'));
    }

    const profile = await prisma.studentProfile.findUnique({
      where: { userId },
      select: {
        userId: true,
        realName: true,
        studentNo: true,
        nationality: true,
        age: true,
        gender: true,
        hskLevel: true,
        major: true,
        completedAt: true
      }
    });

    return res.status(200).json(ok(profile));
  } catch (error) {
    console.error('Get student profile failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/student', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const roles = await getRoles(userId);
    if (!roles.includes('student')) {
      return res.status(403).json(fail('ROLE_FORBIDDEN', 'Student role required'));
    }

    const parsed = profileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const { realName, studentNo, nationality, age, gender, hskLevel, major } = parsed.data;
    const normalizedAge = age && age > 0 ? age : null;

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: {
        realName,
        studentNo,
        nationality,
        age: normalizedAge,
        gender,
        hskLevel,
        major,
        completedAt: new Date()
      },
      create: {
        userId,
        realName,
        studentNo,
        nationality,
        age: normalizedAge,
        gender,
        hskLevel,
        major,
        completedAt: new Date()
      }
    });

    return res.status(200).json(ok(profile));
  } catch (error) {
    console.error('Save student profile failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/password', requireAuth, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const match = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
    if (!match) {
      return res.status(401).json(fail('INVALID_CREDENTIALS', 'Invalid credentials'));
    }

    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    });

    return res.status(200).json(ok({ changed: true }));
  } catch (error) {
    console.error('Change password failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
