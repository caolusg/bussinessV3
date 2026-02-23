import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';

const router = Router();

const ok = <T>(data: T) => ({ ok: true, data });
const fail = (code: string, error: string) => ({ ok: false, code, error });

const sessionSchema = z.object({
  stage: z.string().min(1),
  attemptNo: z.number().int().positive().optional()
});

const messageSchema = z.object({
  content: z.string().min(1)
});

const getUserId = (req: { user?: { id?: string } }) => req.user?.id ?? null;

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

router.post('/session', async (req, res) => {
  try {
    const parsed = sessionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = getUserId(req);
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
      return res.status(200).json(ok({
        sessionId: existing.id,
        stage: existing.stage,
        attemptNo: existing.attemptNo,
        status: existing.status
      }));
    }

    const created = await prisma.simulationSession.create({
      data: {
        userId,
        stage,
        attemptNo,
        status: 'active'
      }
    });

    return res.status(200).json(ok({
      sessionId: created.id,
      stage: created.stage,
      attemptNo: created.attemptNo,
      status: created.status
    }));
  } catch (error) {
    console.error('Create session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.get('/:sessionId/messages', async (req, res) => {
  try {
    const sessionId = req.params.sessionId;
    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId },
      orderBy: { turnIndex: 'asc' }
    });
    return res.status(200).json(ok({ messages }));
  } catch (error) {
    console.error('Get messages failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/:sessionId/messages', async (req, res) => {
  try {
    const parsed = messageSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const sessionId = req.params.sessionId;
    const session = await prisma.simulationSession.findUnique({ where: { id: sessionId } });
    if (!session) {
      return res.status(404).json(fail('NOT_FOUND', 'Session not found'));
    }

    const maxTurn = await prisma.simulationMessage.aggregate({
      where: { sessionId },
      _max: { turnIndex: true }
    });
    const nextTurn = (maxTurn._max.turnIndex ?? 0) + 1;

    const userMessage = await prisma.simulationMessage.create({
      data: {
        sessionId,
        role: 'user',
        content: parsed.data.content,
        turnIndex: nextTurn
      }
    });

    const mock = generateMockReply(parsed.data.content);
    const aiMessage = await prisma.simulationMessage.create({
      data: {
        sessionId,
        role: 'ai',
        content: mock.content,
        coachNote: mock.coachNote,
        turnIndex: nextTurn + 1
      }
    });

    return res.status(200).json(ok({ userMessage, aiMessage }));
  } catch (error) {
    console.error('Post message failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
