import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../env.js';

interface JwtPayload {
  userId: string;
  email?: string;
  role?: 'student' | 'teacher';
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.header('Authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = header.slice('Bearer '.length);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    req.user = {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
    return next();
  } catch {
    return res.status(401).json({ error: 'Unauthorized' });
  }
}
