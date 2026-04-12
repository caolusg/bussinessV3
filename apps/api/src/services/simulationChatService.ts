import type { Prisma, PrismaClient } from '@prisma/client';
import { CompatibleSimulationProvider } from '../ai/providers/compatibleSimulationProvider.js';
import {
  SimulationOrchestrator,
  type SimulationHistoryMessage,
  type SimulationOrchestratorResult,
  type SimulationStage
} from '../ai/simulationOrchestrator.js';

const FALLBACK_OPPONENT_REPLY =
  '我理解你的说明，但目前这个报价对我们还是偏高。除非你能进一步解释价格构成，或者在数量、付款条件上给出更有竞争力的方案，否则我们很难继续推进。';
const COMPATIBLE_CLIENT_FALLBACK_REPLY =
  '我理解你的说明，但这个方案还需要更清楚的业务依据。请你进一步说明条件、风险边界和下一步安排。';
const FALLBACK_REPLY_HISTORY = new Set([
  FALLBACK_OPPONENT_REPLY,
  COMPATIBLE_CLIENT_FALLBACK_REPLY
]);

type Db = Pick<
  PrismaClient,
  | 'businessStage'
  | 'stageTask'
  | 'stageAiScenario'
  | 'simulationSession'
  | 'simulationMessage'
  | '$transaction'
>;

const simulationOrchestrator = new SimulationOrchestrator(
  new CompatibleSimulationProvider()
);

export async function getOrCreateActiveSession(
  prisma: Db,
  userId: string,
  stage: SimulationStage
) {
  const existing = await prisma.simulationSession.findFirst({
    where: {
      userId,
      stage,
      status: 'active'
    },
    orderBy: { createdAt: 'desc' }
  });

  const stageRecord = await prisma.businessStage.findUnique({
    where: { key: stage },
    include: {
      tasks: {
        where: { isActive: true, isDefault: true },
        take: 1
      },
      aiScenarios: {
        where: { isActive: true, isDefault: true },
        take: 1
      }
    }
  });

  const taskId = stageRecord?.tasks[0]?.id;
  const scenarioId = stageRecord?.aiScenarios[0]?.id;

  if (existing) {
    if (!existing.stageId && stageRecord) {
      return prisma.simulationSession.update({
        where: { id: existing.id },
        data: {
          stageId: stageRecord.id,
          taskId,
          scenarioId
        }
      });
    }
    return existing;
  }

  const attempt = await prisma.simulationSession.aggregate({
    where: { userId, stage },
    _max: { attemptNo: true }
  });
  const attemptNo = (attempt._max.attemptNo ?? 0) + 1;

  return prisma.simulationSession.create({
    data: {
      userId,
      stageId: stageRecord?.id,
      taskId,
      scenarioId,
      stage,
      attemptNo,
      status: 'active',
      title: stageRecord?.titleZh
    }
  });
}

function createFallbackOrchestration(): SimulationOrchestratorResult {
  return {
    roleplayReply: FALLBACK_OPPONENT_REPLY,
    coachNote: null,
    assessment: {
      summary: 'AI 暂时不可用，已降级为基础对手回复。'
    },
    personaSnapshot: {
      difficultyAdjustment: 'keep'
    },
    trace: {
      provider: 'compatible',
      usedTools: [],
      usedWebSearch: false,
      degraded: true
    }
  };
}

function toJsonValue(
  value:
    | SimulationOrchestratorResult['assessment']
    | SimulationOrchestratorResult['trace']
    | SimulationOrchestratorResult['personaSnapshot']
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

function isDegradedTrace(traceJson: Prisma.JsonValue | null) {
  if (!traceJson || typeof traceJson !== 'object' || Array.isArray(traceJson)) {
    return false;
  }
  return (traceJson as { degraded?: unknown }).degraded === true;
}

function shouldIncludeInAiHistory(message: {
  role: string;
  content: string;
  traceJson: Prisma.JsonValue | null;
}) {
  if (message.role === 'student') return true;
  return !isDegradedTrace(message.traceJson) && !FALLBACK_REPLY_HISTORY.has(message.content);
}

export async function appendStudentAndOpponent(
  prisma: Db,
  sessionId: string,
  content: string,
  stage?: SimulationStage
) {
  const { studentMessage, nextTurn, history } = await prisma.$transaction(
    async (tx: Prisma.TransactionClient) => {
      const maxTurn = await tx.simulationMessage.aggregate({
        where: { sessionId },
        _max: { turnIndex: true }
      });
      const nextTurn = (maxTurn._max.turnIndex ?? -1) + 1;

      const studentMessage = await tx.simulationMessage.create({
        data: {
          sessionId,
          role: 'student',
          content,
          turnIndex: nextTurn
        }
      });

      const recent = await tx.simulationMessage.findMany({
        where: { sessionId },
        orderBy: { turnIndex: 'desc' },
        take: 20
      });

      const history: SimulationHistoryMessage[] = [...recent]
        .reverse()
        .filter(shouldIncludeInAiHistory)
        .map((message) => ({
          role: message.role === 'student' ? 'student' : 'coach',
          content: message.content
        }));

      return { studentMessage, nextTurn, history };
    }
  );

  let orchestration = createFallbackOrchestration();

  try {
    orchestration = await simulationOrchestrator.generate({
      stage: stage ?? 'quotation',
      messages: history
    });
  } catch {
    orchestration = createFallbackOrchestration();
  }

  const opponentMessage = await prisma.simulationMessage.create({
    data: {
      sessionId,
      role: 'opponent',
      content: orchestration.roleplayReply,
      coachNote: orchestration.coachNote ?? undefined,
      assessmentJson: toJsonValue(orchestration.assessment),
      traceJson: toJsonValue(orchestration.trace),
      personaJson: toJsonValue(orchestration.personaSnapshot),
      turnIndex: nextTurn + 1
    }
  });

  return { studentMessage, opponentMessage, orchestration };
}
