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
  major: z.string().trim().min(1),
  classGroup: z.string().trim().min(1).default('其他')
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

router.get('/options', requireAuth, async (_req, res) => {
  try {
    const [majorOptions, classGroupOptions] = await Promise.all([
      prisma.profileOption.findMany({
        where: { category: 'major', isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        select: { id: true, value: true, label: true }
      }),
      prisma.profileOption.findMany({
        where: { category: 'class_group', isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { label: 'asc' }],
        select: { id: true, value: true, label: true }
      })
    ]);

    return res.status(200).json(ok({ majorOptions, classGroupOptions }));
  } catch (error) {
    console.error('Get profile options failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

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
        classGroup: true,
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

    const { realName, studentNo, nationality, age, gender, hskLevel, major, classGroup } = parsed.data;
    const normalizedAge = age && age > 0 ? age : null;
    const [majorOption, classGroupOption] = await Promise.all([
      prisma.profileOption.findFirst({
        where: { category: 'major', value: major, isActive: true },
        select: { id: true }
      }),
      prisma.profileOption.findFirst({
        where: { category: 'class_group', value: classGroup, isActive: true },
        select: { id: true }
      })
    ]);

    if (!majorOption) {
      return res.status(400).json(fail('INVALID_MAJOR', '请选择系统允许的专业方向'));
    }
    if (!classGroupOption) {
      return res.status(400).json(fail('INVALID_CLASS_GROUP', '请选择系统允许的班级/组'));
    }

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
        classGroup,
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
        classGroup,
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
