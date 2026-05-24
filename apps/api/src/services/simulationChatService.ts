import type { Prisma, PrismaClient } from '@prisma/client';
import type { InputJsonValue, JsonValue } from '@prisma/client/runtime/library';
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
const DEFAULT_OPPONENT_GREETING =
  '你好，我是中国商通外贸公司的采购经理郑远航，请先介绍贵公司的产品。';

const buildOpponentGreeting = (opponentName?: string | null) =>
  opponentName?.trim()
    ? `你好，我是中国商通外贸公司的采购经理${opponentName.trim()}，请先介绍贵公司的产品。`
    : DEFAULT_OPPONENT_GREETING;

type Db = Pick<
  PrismaClient,
  | 'businessStage'
  | 'stageTask'
  | 'stageAiScenario'
  | 'simulationSession'
  | 'simulationMessage'
  | '$transaction'
>;

type ActiveScenario = {
  id: string;
  name: string;
  opponentName: string | null;
  opponentRole: string | null;
  systemPrompt: string;
  difficulty: string;
  promptVersion: string;
};

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
    if (stageRecord && (!existing.stageId || existing.scenarioId !== scenarioId || existing.taskId !== taskId)) {
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

export async function restartStageSession(
  prisma: Db,
  userId: string,
  stage: SimulationStage
) {
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

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.simulationSession.updateMany({
      where: {
        userId,
        stage,
        status: 'active'
      },
      data: {
        status: 'ended'
      }
    });

    const attempt = await tx.simulationSession.aggregate({
      where: { userId, stage },
      _max: { attemptNo: true }
    });
    const attemptNo = (attempt._max.attemptNo ?? 0) + 1;

    return tx.simulationSession.create({
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
  });
}

export async function endStageSession(
  prisma: Db,
  userId: string,
  stage: SimulationStage
) {
  await prisma.simulationSession.updateMany({
    where: {
      userId,
      stage,
      status: 'active'
    },
    data: {
      status: 'ended'
    }
  });
}

export async function ensureSessionGreeting(prisma: Db, sessionId: string) {
  const session = await prisma.simulationSession.findUnique({
    where: { id: sessionId },
    include: {
      scenario: {
        select: { opponentName: true }
      }
    }
  });
  const greeting = buildOpponentGreeting(session?.scenario?.opponentName);

  const existingGreeting = await prisma.simulationMessage.findFirst({
    where: {
      sessionId,
      role: 'opponent',
      turnIndex: { lte: 0 }
    },
    select: { id: true }
  });

  if (existingGreeting) return null;

  const minTurn = await prisma.simulationMessage.aggregate({
    where: { sessionId },
    _min: { turnIndex: true }
  });

  return prisma.simulationMessage.create({
    data: {
      sessionId,
      role: 'opponent',
      content: greeting,
      turnIndex: minTurn._min.turnIndex == null ? 0 : minTurn._min.turnIndex - 1
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
      degraded: true,
      model: null,
      errorCode: 'AI_ORCHESTRATION_FAILED',
      errorMessage: 'Simulation AI orchestration failed before a provider response was available.',
      promptVersion: 'v1',
      scenarioId: null
    }
  };
}

function toJsonValue(
  value:
    | SimulationOrchestratorResult['assessment']
    | SimulationOrchestratorResult['trace']
    | SimulationOrchestratorResult['personaSnapshot']
): InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as InputJsonValue;
}

function isDegradedTrace(traceJson: JsonValue | null) {
  if (!traceJson || typeof traceJson !== 'object' || Array.isArray(traceJson)) {
    return false;
  }
  return (traceJson as { degraded?: unknown }).degraded === true;
}

function trimAiHistoryContent(content: string) {
  return content.length > 1200 ? `${content.slice(0, 1200)}...` : content;
}

function shouldIncludeInAiHistory(message: {
  role: string;
  content: string;
  traceJson: JsonValue | null;
}) {
  if (message.role === 'student') return true;
  return !isDegradedTrace(message.traceJson) && !FALLBACK_REPLY_HISTORY.has(message.content);
}

export async function appendStudentAndOpponent(
  prisma: Db,
  sessionId: string,
  content: string,
  stage?: SimulationStage,
  productCatalogContext?: string | null
) {
  const { studentMessage, nextTurn, history, scenario } = await prisma.$transaction(
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
        take: 12
      });

      const history: SimulationHistoryMessage[] = [...recent]
        .reverse()
        .filter(shouldIncludeInAiHistory)
        .map((message) => ({
          role: message.role === 'student' ? 'student' : 'coach',
          content: trimAiHistoryContent(message.content)
        }));

      const session = await tx.simulationSession.findUnique({
        where: { id: sessionId },
        include: {
          scenario: {
            select: {
              id: true,
              name: true,
              opponentName: true,
              opponentRole: true,
              systemPrompt: true,
              difficulty: true,
              promptVersion: true,
              isActive: true
            }
          },
          businessStage: {
            include: {
              aiScenarios: {
                where: { isActive: true, isDefault: true },
                take: 1
              }
            }
          }
        }
      });

      const activeScenario = session?.scenario?.isActive
        ? session.scenario
        : session?.businessStage?.aiScenarios[0];

      return {
        studentMessage,
        nextTurn,
        history,
        scenario: activeScenario
          ? {
              id: activeScenario.id,
              name: activeScenario.name,
              opponentName: activeScenario.opponentName,
              opponentRole: activeScenario.opponentRole,
              systemPrompt: activeScenario.systemPrompt,
              difficulty: activeScenario.difficulty,
              promptVersion: activeScenario.promptVersion
            } satisfies ActiveScenario
          : null
      };
    }
  );

  let orchestration = createFallbackOrchestration();

  try {
    orchestration = await simulationOrchestrator.generate({
      stage: stage ?? 'quotation',
      messages: history,
      productCatalogContext,
      scenario
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown simulation AI orchestration error.';
    orchestration = createFallbackOrchestration();
    orchestration.trace.errorMessage = message;
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

  return { studentMessage, opponentMessage, orchestration, scenario };
}
