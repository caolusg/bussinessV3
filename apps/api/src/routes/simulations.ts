import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  appendStudentAndOpponent,
  getOrCreateActiveSession,
  restartStageSession
} from '../services/simulationChatService.js';
import {
  logAiInteraction,
  logMessageAnalysis,
  logPracticeEvent
} from '../services/researchLogService.js';

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

function buildOrchestrationFromMessage(message: {
  content: string;
  coachNote?: string | null;
  assessmentJson?: unknown;
  traceJson?: unknown;
  personaJson?: unknown;
}) {
  if (
    !message.coachNote &&
    !message.assessmentJson &&
    !message.traceJson &&
    !message.personaJson
  ) {
    return null;
  }

  return {
    roleplayReply: message.content,
    coachNote: message.coachNote ?? null,
    assessment: message.assessmentJson ?? undefined,
    trace: message.traceJson ?? undefined,
    personaSnapshot: message.personaJson ?? undefined
  };
}

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

    await logPracticeEvent(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      eventType: 'practice_session_opened',
      metadata: {
        stage,
        status: session.status
      }
    });

    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' }
    });

    const latestStructuredMessage = [...messages]
      .reverse()
      .find(
        (message) =>
          Boolean(message.coachNote) ||
          Boolean(message.assessmentJson) ||
          Boolean(message.traceJson) ||
          Boolean(message.personaJson)
      );

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
      orchestration: latestStructuredMessage
        ? buildOrchestrationFromMessage(latestStructuredMessage)
        : null,
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
    const { studentMessage, opponentMessage, orchestration } = await appendStudentAndOpponent(
      prisma,
      session.id,
      content,
      stage
    );

    await logPracticeEvent(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      eventType: 'student_message_sent',
      metadata: {
        stage,
        messageId: studentMessage.id,
        characterCount: content.length
      }
    });

    await logAiInteraction(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      messageId: opponentMessage.id,
      provider: orchestration.trace.provider,
      promptVersion: 'v1',
      inputMessages: {
        latestStudentMessage: content,
        stage
      },
      outputText: orchestration.roleplayReply,
      outputJson: {
        coachNote: orchestration.coachNote ?? null,
        assessment: orchestration.assessment ?? null,
        personaSnapshot: orchestration.personaSnapshot ?? null,
        trace: orchestration.trace
      },
      degraded: orchestration.trace.degraded ?? false
    });

    await logMessageAnalysis(prisma, {
      messageId: studentMessage.id,
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      analysisVersion: 'v1',
      languageQuality: orchestration.assessment ?? undefined,
      businessStrategy: {
        coachNote: orchestration.coachNote ?? null,
        stage
      },
      score: orchestration.assessment?.score
        ? { score: orchestration.assessment.score }
        : undefined
    });

    return res.status(200).json({
      sessionId: session.id,
      stage: session.stage,
      attemptNo: session.attemptNo,
      orchestration,
      messages: [
        {
          id: studentMessage.id,
          role: studentMessage.role,
          content: studentMessage.content,
          turnIndex: studentMessage.turnIndex,
          createdAt: studentMessage.createdAt
        },
        {
          id: opponentMessage.id,
          role: opponentMessage.role,
          content: opponentMessage.content,
          coachNote: opponentMessage.coachNote,
          assessmentJson: opponentMessage.assessmentJson,
          traceJson: opponentMessage.traceJson,
          personaJson: opponentMessage.personaJson,
          turnIndex: opponentMessage.turnIndex,
          createdAt: opponentMessage.createdAt
        }
      ]
    });
  } catch (error) {
    console.error('Post message failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/:stage/restart', requireAuth, async (req, res) => {
  try {
    const paramsParsed = messageParamsSchema.safeParse(req.params);
    if (!paramsParsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const stage = paramsParsed.data.stage;
    const session = await restartStageSession(prisma, userId, stage);

    await logPracticeEvent(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      eventType: 'practice_session_restarted',
      metadata: {
        stage,
        status: session.status,
        attemptNo: session.attemptNo
      }
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
      orchestration: null,
      messages: []
    }));
  } catch (error) {
    console.error('Restart session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
