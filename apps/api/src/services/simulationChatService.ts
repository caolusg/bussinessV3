import type { Prisma, PrismaClient } from '@prisma/client';
import { OpenAISimulationProvider } from '../ai/providers/openaiSimulationProvider.js';
import {
  SimulationOrchestrator,
  type SimulationHistoryMessage,
  type SimulationOrchestratorResult,
  type SimulationStage
} from '../ai/simulationOrchestrator.js';

const FALLBACK_COACH_REPLY =
  '锛堢郴缁熸彁绀猴級AI 鏆傛椂涓嶅彲鐢紝鎴戝厛缁欎綘涓€涓彲鎵ц鐨勮皥鍒ゅ缓璁細\n' +
  '1) 鍏堝叡鎯呭苟纭瀵规柟鍏虫敞鐐癸紱\n' +
  '2) 鐢ㄦ暟鎹В閲婁环鏍煎樊寮傦紙璐ㄩ噺/浜や粯/鍞悗/鍚堣锛夛紱\n' +
  '3) 缁欏嚭涓ゆ。鏂规锛堟爣鍑嗙増/浼樺寲鐗堬級骞跺紩瀵煎鏂归€夋嫨锛沑n' +
  '4) 浠ュ皬璁╂鎹㈠彇瀵规柟鎵胯锛堟暟閲?浠樻/闀挎湡鍚堜綔锛夈€俓n' +
  '浣犲彲浠ュ厛鍥炲锛氥€庣悊瑙ｄ綘浠殑棰勭畻鍘嬪姏銆傛垜浠繖娆℃姤浠峰寘鍚玐XX锛堜氦浠?璐ㄤ繚/鏈嶅姟锛夛紝濡傛灉浣犱滑鎰挎剰鎶婃暟閲忔彁鍗囧埌X鎴栧皢浠樻鏉℃鏀逛负Y锛屾垜浠彲浠ユ妸鍗曚环涓嬭皟鍒癦銆備綘鏇村€惧悜鍝竴绉嶏紵銆?';

type Db = Pick<
  PrismaClient,
  'simulationSession' | 'simulationMessage' | '$transaction'
>;

const simulationOrchestrator = new SimulationOrchestrator(
  new OpenAISimulationProvider()
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

  if (existing) return existing;

  const attempt = await prisma.simulationSession.aggregate({
    where: { userId, stage },
    _max: { attemptNo: true }
  });
  const attemptNo = (attempt._max.attemptNo ?? 0) + 1;

  return prisma.simulationSession.create({
    data: {
      userId,
      stage,
      attemptNo,
      status: 'active'
    }
  });
}

function fallbackCoach() {
  return FALLBACK_COACH_REPLY;
}

function createFallbackOrchestration(): SimulationOrchestratorResult {
  return {
    roleplayReply: fallbackCoach(),
    coachNote: null,
    assessment: {
      summary: 'AI 暂时不可用，已降级为基础建议。'
    },
    personaSnapshot: {
      difficultyAdjustment: 'keep'
    },
    trace: {
      provider: 'openai',
      usedTools: [],
      usedWebSearch: false,
      degraded: true
    }
  };
}

function toJsonValue(
  value: SimulationOrchestratorResult['assessment'] |
    SimulationOrchestratorResult['trace'] |
    SimulationOrchestratorResult['personaSnapshot']
): Prisma.InputJsonValue | undefined {
  if (value == null) return undefined;
  return value as Prisma.InputJsonValue;
}

export async function appendStudentAndOpponent(
  prisma: Db,
  sessionId: string,
  content: string,
  stage?: SimulationStage
) {
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

    const history: SimulationHistoryMessage[] = [...recent].reverse().map((m) => ({
      role: m.role === 'student' ? 'student' : 'coach',
      content: m.content
    }));

    let orchestration = createFallbackOrchestration();

    try {
      orchestration = await simulationOrchestrator.generate({
        stage: stage ?? 'quotation',
        messages: history
      });
    } catch {
      orchestration = createFallbackOrchestration();
    }

    const opponentMessage = await tx.simulationMessage.create({
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
  });
}
