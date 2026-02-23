import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

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
  stage: stageSchema,
  attemptNo: z.number().int().positive().optional()
});

const messageSchema = z.object({
  sessionId: z.string().uuid(),
  content: z.string().min(1)
});

const getUserId = async (req: { user?: { id?: string }; headers?: Record<string, string> }) => {
  if (req.user?.id) return req.user.id;
  const headerId = req.headers?.['x-user-id'];
  if (headerId) return headerId;
  const fallback = await prisma.user.findFirst({ select: { id: true } });
  return fallback?.id ?? null;
};

const generateMockReply = (content: string) => {
  const text = content.toLowerCase();
  if (text.includes('fob') || text.includes('shipping') || text.includes('运费')) {
    return {
      content:
        'Thanks for clarifying FOB. Could you confirm which costs are included and provide a breakdown for logistics and handling?',
      coachNote: '解释 FOB 风险划分，并明确报价构成（货价/运费/保险）。'
    };
  }
  if (text.includes('price') || text.includes('quote') || text.includes('10%') || text.includes('报价')) {
    return {
      content:
        'Your price is still above our target. What value justifies the premium, and can you adjust the quote?',
      coachNote: '报价需说明价值与成本构成，避免只给数字。'
    };
  }
  return {
    content:
      'I understand. Could you walk me through the main cost drivers and how you ensure reliability at this price?',
    coachNote: '引导客户聚焦成本结构与风险边界。'
  };
};

router.get('/session', async (req, res) => {
  try {
    const parsed = sessionSchema.safeParse({
      stage: req.query.stage,
      attemptNo: req.query.attemptNo ? Number(req.query.attemptNo) : undefined
    });
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = await getUserId(req);
    const stage = parsed.data.stage;
    const attemptNo = parsed.data.attemptNo ?? 1;

    const existing = await prisma.simulationSession.findFirst({
      where: {
        userId,
        stage,
        status: 'active'
      }
    });

    if (existing) {
      const messages = await prisma.simulationMessage.findMany({
        where: { sessionId: existing.id },
        orderBy: { turnIndex: 'asc' }
      });
      return res.status(200).json(ok({
        session: {
          id: existing.id,
          userId: existing.userId,
          stage: existing.stage,
          attemptNo: existing.attemptNo,
          status: existing.status,
          createdAt: existing.createdAt,
          updatedAt: existing.updatedAt
        },
        messages
      }));
    }

    const created = await prisma.$transaction(async (tx) => {
      const again = await tx.simulationSession.findFirst({
        where: { userId, stage, status: 'active' },
        orderBy: { createdAt: 'desc' }
      });
      if (again) return again;
      return tx.simulationSession.create({
        data: {
          userId,
          stage,
          attemptNo,
          status: 'active'
        }
      });
    });

    return res.status(200).json(ok({
      session: {
        id: created.id,
        userId: created.userId,
        stage: created.stage,
        attemptNo: created.attemptNo,
        status: created.status,
        createdAt: created.createdAt,
        updatedAt: created.updatedAt
      },
      messages: []
    }));
  } catch (error) {
    console.error('Create session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/message', async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const sessionId = parsed.data.sessionId;
    const session = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json(fail('NOT_FOUND', 'Session not found'));
    }

    const recent = await prisma.simulationMessage.findFirst({
      where: { sessionId, role: 'user' },
      orderBy: { createdAt: 'desc' }
    });
    if (recent && recent.content === parsed.data.content) {
      const lastTwo = await prisma.simulationMessage.findMany({
        where: { sessionId, turnIndex: { gte: recent.turnIndex } },
        orderBy: { turnIndex: 'asc' }
      });
      const userMessage = lastTwo.find((m) => m.role === 'user') ?? recent;
      const aiMessage = lastTwo.find((m) => m.role === 'ai') ?? null;
      return res.status(200).json(ok({ userMessage, aiMessage }));
    }

    const maxTurn = await prisma.simulationMessage.aggregate({
      where: { sessionId },
      _max: { turnIndex: true }
    });
    const nextTurn = (maxTurn._max.turnIndex ?? 0) + 1;

    const mock = generateMockReply(parsed.data.content);

    const [userMessage, aiMessage] = await prisma.$transaction(async (tx) => {
      const user = await tx.simulationMessage.create({
        data: {
          sessionId,
          role: 'user',
          content: parsed.data.content,
          turnIndex: nextTurn
        }
      });
      const ai = await tx.simulationMessage.create({
        data: {
          sessionId,
          role: 'ai',
          content: mock.content,
          coachNote: mock.coachNote,
          turnIndex: nextTurn + 1
        }
      });
      return [user, ai];
    });

    return res.status(200).json(ok({ userMessage, aiMessage }));
  } catch (error) {
    console.error('Post message failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
