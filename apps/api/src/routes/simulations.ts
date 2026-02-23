import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  appendStudentAndMockCoach,
  getOrCreateActiveSession
} from '../services/simulationChatService.js';

const router = Router();

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const stageSchema = z.enum([
  'acquisition',
  'quotation',
  'negotiation',
  'contract',
  'preparation',
  'customs',
  'settlement',
  'after_sales'
]);

const sessionSchema = z.object({
  stage: stageSchema
});

const messageParamsSchema = z.object({
  stage: stageSchema
});

const messageBodySchema = z.object({
  content: z.string().min(1).max(2000)
});

router.get('/session', requireAuth, async (req, res) => {
  try {
    const parsed = sessionSchema.safeParse({
      stage: req.query.stage
    });
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const stage = parsed.data.stage;
    const session = await getOrCreateActiveSession(prisma, userId, stage);

    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' }
    });

    return res.status(200).json(ok({
      session: {
        id: session.id,
        userId: session.userId,
        stage: session.stage,
        attemptNo: session.attemptNo,
        status: session.status,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      messages
    }));
  } catch (error) {
    console.error('Create session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/:stage/message', requireAuth, async (req, res) => {
  try {
    const paramsParsed = messageParamsSchema.safeParse(req.params);
    const bodyParsed = messageBodySchema.safeParse(req.body);
    if (!paramsParsed.success || !bodyParsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const stage = paramsParsed.data.stage;
    const content = bodyParsed.data.content;

    const session = await getOrCreateActiveSession(prisma, userId, stage);
    const { studentMessage, coachMessage } = await appendStudentAndMockCoach(
      prisma,
      session.id,
      content
    );

    return res.status(200).json({
      sessionId: session.id,
      stage: session.stage,
      attemptNo: session.attemptNo,
      messages: [
        {
          id: studentMessage.id,
          role: studentMessage.role,
          content: studentMessage.content,
          turnIndex: studentMessage.turnIndex,
          createdAt: studentMessage.createdAt
        },
        {
          id: coachMessage.id,
          role: coachMessage.role,
          content: coachMessage.content,
          turnIndex: coachMessage.turnIndex,
          createdAt: coachMessage.createdAt
        }
      ]
    });
  } catch (error) {
    console.error('Post message failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
