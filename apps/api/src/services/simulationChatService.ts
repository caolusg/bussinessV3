import type { Prisma, PrismaClient } from '@prisma/client';
import { generateCoachReply } from '../ai/openaiClient.js';

const FALLBACK_COACH_REPLY =
  '（系统提示）AI 暂时不可用，我先给你一个可执行的谈判建议：\n' +
  '1) 先共情并确认对方关注点；\n' +
  '2) 用数据解释价格差异（质量/交付/售后/合规）；\n' +
  '3) 给出两档方案（标准版/优化版）并引导对方选择；\n' +
  '4) 以小让步换取对方承诺（数量/付款/长期合作）。\n' +
  '你可以先回复：『理解你们的预算压力。我们这次报价包含XXX（交付/质保/服务），如果你们愿意把数量提升到X或将付款条款改为Y，我们可以把单价下调到Z。你更倾向哪一种？』';

type Db = Pick<
  PrismaClient,
  'simulationSession' | 'simulationMessage' | '$transaction'
>;

type SimulationStage =
  | 'acquisition'
  | 'quotation'
  | 'negotiation'
  | 'contract'
  | 'preparation'
  | 'customs'
  | 'settlement'
  | 'after_sales';

type CoachHistoryMessage = {
  role: 'student' | 'coach';
  content: string;
};

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

export async function appendStudentAndMockCoach(
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

    const history: CoachHistoryMessage[] = [...recent].reverse().map((m) => ({
      role: m.role === 'coach' ? 'coach' : 'student',
      content: m.content
    }));

    let coachContent = fallbackCoach();
    try {
      coachContent = await generateCoachReply({
        stage: stage ?? 'quotation',
        messages: history
      });
    } catch {
      coachContent = fallbackCoach();
    }

    const coachMessage = await tx.simulationMessage.create({
      data: {
        sessionId,
        role: 'coach',
        content: coachContent,
        coachNote: undefined,
        turnIndex: nextTurn + 1
      }
    });

    return { studentMessage, coachMessage };
  });
}
