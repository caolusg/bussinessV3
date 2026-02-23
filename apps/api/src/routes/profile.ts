import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = Router();

const profileSchema = z.object({
  realName: z.string().min(1),
  studentNo: z.string().min(1),
  nationality: z.string().min(1),
  age: z.number().int().positive(),
  gender: z.string().min(1),
  hskLevel: z.string().min(1),
  major: z.string().min(1)
});

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const getRoles = async (userId: string) => {
  const roles = await prisma.userRole.findMany({
    where: { userId },
    include: { role: true }
  });
  return roles.map((r) => r.role.key);
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

    const profile = await prisma.studentProfile.upsert({
      where: { userId },
      update: {
        realName,
        studentNo,
        nationality,
        age,
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
        age,
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

export default router;
