import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { EMAIL_VERIFICATION_REQUIRED, JWT_SECRET } from '../env.js';
import { prisma } from '../lib/prisma.js';

interface JwtPayload {
  userId: string;
  email?: string;
  role?: 'student' | 'teacher';
}

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        emailVerifiedAt: true,
        status: true,
        roles: {
          select: {
            role: {
              select: { key: true }
            }
          }
        }
      }
    });

    const statusAllowed = user?.status === 'ACTIVE' || (!EMAIL_VERIFICATION_REQUIRED && user?.status === 'PENDING_VERIFICATION');
    if (!user || !statusAllowed) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const roles = user.roles.map((item) => item.role.key);
    if (EMAIL_VERIFICATION_REQUIRED && roles.includes('student') && !user.emailVerifiedAt) {
      return res.status(401).json({ error: 'EMAIL_NOT_VERIFIED' });
    }

    req.user = {
      id: user.id,
      email: user.email ?? payload.email,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
