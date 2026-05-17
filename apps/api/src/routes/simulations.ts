import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import {
  appendStudentAndOpponent,
  endStageSession,
  ensureSessionGreeting,
  getOrCreateActiveSession,
  restartStageSession
} from '../services/simulationChatService.js';
import { generateCoachingReply, getAiProviderName } from '../ai/compatibleAiClient.js';
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

const coachParamsSchema = z.object({
  sessionId: z.string().uuid()
});

const coachBodySchema = z.object({
  question: z.string().trim().min(1).max(1000)
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

const roleLabel: Record<string, string> = {
  student: '我方',
  opponent: '客户',
  coach: 'AI 教练',
  system: '系统'
};

function buildCoachSummary(messages: Array<{ role: string; content: string }>) {
  const latestOpponent = [...messages].reverse().find((message) => message.role === 'opponent');
  const latestStudent = [...messages].reverse().find((message) => message.role === 'student');
  if (!latestOpponent && !latestStudent) {
    return '当前会话还没有足够内容，AI 教练会先根据阶段任务给出通用准备建议。';
  }

  return [
    latestOpponent ? `客户最近关注：${latestOpponent.content}` : null,
    latestStudent ? `你最近回应：${latestStudent.content}` : null
  ].filter(Boolean).join('\n');
}

function buildSuggestedCoachQuestions(messages: Array<{ role: string; content: string }>) {
  const latestOpponent = [...messages].reverse().find((message) => message.role === 'opponent');
  const base = [
    '客户刚才这句话真正想确认什么？',
    '我下一句应该怎么回复更专业？',
    '这里有哪些商务风险或隐藏条件？',
    '帮我把客户的问题拆成简单中文解释。'
  ];

  if (!latestOpponent) return base;

  return [
    `客户说“${latestOpponent.content.slice(0, 36)}${latestOpponent.content.length > 36 ? '...' : ''}”是什么意思？`,
    ...base.slice(1)
  ];
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
    await ensureSessionGreeting(prisma, session.id);

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

router.get('/coach/:sessionId/context', requireAuth, async (req, res) => {
  try {
    const parsed = coachParamsSchema.safeParse(req.params);
    if (!parsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid session id'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const session = await prisma.simulationSession.findFirst({
      where: {
        id: parsed.data.sessionId,
        userId
      },
      include: {
        businessStage: {
          select: {
            key: true,
            titleZh: true,
            titleEn: true,
            description: true
          }
        },
        task: {
          select: {
            title: true,
            goal: true,
            subGoal: true
          }
        }
      }
    });

    if (!session) {
      return res.status(404).json(fail('NOT_FOUND', 'Session not found'));
    }

    await ensureSessionGreeting(prisma, session.id);

    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        coachNote: true,
        assessmentJson: true,
        turnIndex: true,
        createdAt: true
      }
    });

    await logPracticeEvent(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      eventType: 'coach_context_opened',
      metadata: {
        stage: session.stage,
        messageCount: messages.length
      }
    });

    return res.status(200).json(ok({
      session: {
        id: session.id,
        stage: session.stage,
        status: session.status,
        attemptNo: session.attemptNo,
        title: session.title,
        businessStage: session.businessStage,
        task: session.task
      },
      summary: buildCoachSummary(messages),
      suggestedQuestions: buildSuggestedCoachQuestions(messages),
      messages: messages.map((message) => ({
        ...message,
        speakerLabel: roleLabel[message.role] ?? message.role
      }))
    }));
  } catch (error) {
    console.error('Get coach context failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/coach/:sessionId/message', requireAuth, async (req, res) => {
  try {
    const paramsParsed = coachParamsSchema.safeParse(req.params);
    const bodyParsed = coachBodySchema.safeParse(req.body);
    if (!paramsParsed.success || !bodyParsed.success) {
      return res.status(400).json(fail('INVALID_REQUEST', 'Invalid request'));
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json(fail('UNAUTHORIZED', 'Unauthorized'));
    }

    const session = await prisma.simulationSession.findFirst({
      where: {
        id: paramsParsed.data.sessionId,
        userId
      }
    });

    if (!session) {
      return res.status(404).json(fail('NOT_FOUND', 'Session not found'));
    }

    await ensureSessionGreeting(prisma, session.id);

    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' },
      select: {
        role: true,
        content: true
      }
    });

    const coachingMessages = messages.map((message) => ({
      role:
        message.role === 'student'
          ? 'student' as const
          : message.role === 'opponent'
            ? 'opponent' as const
            : 'coach' as const,
      content: message.content
    }));

    const reply = await generateCoachingReply({
      stage: session.stage,
      question: bodyParsed.data.question,
      messages: coachingMessages
    });

    await logPracticeEvent(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      eventType: 'coach_question_asked',
      metadata: {
        question: bodyParsed.data.question,
        degraded: reply.degraded
      }
    });

    await logAiInteraction(prisma, {
      userId,
      stageId: session.stageId,
      sessionId: session.id,
      provider: getAiProviderName(),
      promptVersion: 'coach-v1',
      inputMessages: {
        question: bodyParsed.data.question,
        recentMessages: coachingMessages.slice(-16)
      },
      outputText: reply.content,
      outputJson: {
        mode: 'coaching',
        degraded: reply.degraded
      },
      degraded: reply.degraded
    });

    return res.status(200).json(ok({
      answer: reply.content,
      degraded: reply.degraded,
      suggestedQuestions: buildSuggestedCoachQuestions(messages)
    }));
  } catch (error) {
    console.error('Post coach message failed:', error);
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
    await ensureSessionGreeting(prisma, session.id);

    const { studentMessage, opponentMessage, orchestration, scenario } = await appendStudentAndOpponent(
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
      promptVersion: scenario?.promptVersion ?? orchestration.trace.promptVersion ?? 'v1',
      systemPrompt: scenario?.systemPrompt ?? undefined,
      inputMessages: {
        latestStudentMessage: content,
        stage,
        scenarioId: scenario?.id ?? null,
        scenarioName: scenario?.name ?? null,
        opponentName: scenario?.opponentName ?? null,
        opponentRole: scenario?.opponentRole ?? null,
        difficulty: scenario?.difficulty ?? null
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

    const messages = await prisma.simulationMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { turnIndex: 'asc' },
      select: {
        id: true,
        role: true,
        content: true,
        coachNote: true,
        assessmentJson: true,
        traceJson: true,
        personaJson: true,
        turnIndex: true,
        createdAt: true
      }
    });

    return res.status(200).json({
      sessionId: session.id,
      stage: session.stage,
      attemptNo: session.attemptNo,
      orchestration,
      messages
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
    const greeting = await ensureSessionGreeting(prisma, session.id);

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
      messages: greeting ? [greeting] : []
    }));
  } catch (error) {
    console.error('Restart session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

router.post('/:stage/end', requireAuth, async (req, res) => {
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
    await endStageSession(prisma, userId, stage);

    await logPracticeEvent(prisma, {
      userId,
      eventType: 'practice_session_ended',
      metadata: {
        stage
      }
    });

    return res.status(200).json(ok({ ended: true }));
  } catch (error) {
    console.error('End session failed:', error);
    return res.status(500).json(fail('INTERNAL_ERROR', 'Internal error'));
  }
});

export default router;
