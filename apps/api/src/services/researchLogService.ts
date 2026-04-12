import type { Prisma, PrismaClient } from '@prisma/client';

type Db = Pick<PrismaClient, 'practiceEvent' | 'aiInteractionLog' | 'messageAnalysisResult'>;

type PracticeEventInput = {
  userId?: string | null;
  stageId?: string | null;
  sessionId?: string | null;
  resourceId?: string | null;
  eventType: string;
  metadata?: Prisma.InputJsonValue;
};

type AiInteractionInput = {
  userId?: string | null;
  sessionId?: string | null;
  messageId?: string | null;
  stageId?: string | null;
  provider?: string | null;
  model?: string | null;
  promptVersion?: string | null;
  systemPrompt?: string | null;
  inputMessages?: Prisma.InputJsonValue;
  outputText?: string | null;
  outputJson?: Prisma.InputJsonValue;
  latencyMs?: number | null;
  degraded?: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
};

type MessageAnalysisInput = {
  messageId: string;
  userId?: string | null;
  sessionId?: string | null;
  stageId?: string | null;
  analysisVersion: string;
  languageQuality?: Prisma.InputJsonValue;
  businessStrategy?: Prisma.InputJsonValue;
  tradeTermUsage?: Prisma.InputJsonValue;
  errorTags?: Prisma.InputJsonValue;
  score?: Prisma.InputJsonValue;
};

export async function logPracticeEvent(prisma: Db, input: PracticeEventInput) {
  try {
    await prisma.practiceEvent.create({
      data: {
        userId: input.userId ?? undefined,
        stageId: input.stageId ?? undefined,
        sessionId: input.sessionId ?? undefined,
        resourceId: input.resourceId ?? undefined,
        eventType: input.eventType,
        metadataJson: input.metadata
      }
    });
  } catch (error) {
    console.error('Practice event log failed:', error);
  }
}

export async function logAiInteraction(prisma: Db, input: AiInteractionInput) {
  try {
    await prisma.aiInteractionLog.create({
      data: {
        userId: input.userId ?? undefined,
        sessionId: input.sessionId ?? undefined,
        messageId: input.messageId ?? undefined,
        stageId: input.stageId ?? undefined,
        provider: input.provider ?? undefined,
        model: input.model ?? undefined,
        promptVersion: input.promptVersion ?? undefined,
        systemPrompt: input.systemPrompt ?? undefined,
        inputMessagesJson: input.inputMessages,
        outputText: input.outputText ?? undefined,
        outputJson: input.outputJson,
        latencyMs: input.latencyMs ?? undefined,
        degraded: input.degraded ?? false,
        errorCode: input.errorCode ?? undefined,
        errorMessage: input.errorMessage ?? undefined
      }
    });
  } catch (error) {
    console.error('AI interaction log failed:', error);
  }
}

export async function logMessageAnalysis(prisma: Db, input: MessageAnalysisInput) {
  try {
    await prisma.messageAnalysisResult.create({
      data: {
        messageId: input.messageId,
        userId: input.userId ?? undefined,
        sessionId: input.sessionId ?? undefined,
        stageId: input.stageId ?? undefined,
        analysisVersion: input.analysisVersion,
        languageQualityJson: input.languageQuality,
        businessStrategyJson: input.businessStrategy,
        tradeTermUsageJson: input.tradeTermUsage,
        errorTagsJson: input.errorTags,
        scoreJson: input.score
      }
    });
  } catch (error) {
    console.error('Message analysis log failed:', error);
  }
}
