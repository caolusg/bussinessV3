import { getAiProviderName, generateRoleplayReply } from '../compatibleAiClient.js';
import type {
  SimulationOrchestratorInput,
  SimulationOrchestratorResult,
  SimulationStage,
  SimulationProvider
} from '../simulationOrchestrator.js';

const STAGE_COACH_NOTES: Record<SimulationStage, string> = {
  acquisition: '先确认客户需求、采购背景和决策角色，再推进产品介绍。',
  quotation: '报价时要同步说明价格构成、交付条件和可谈判空间。',
  negotiation: '谈判时避免只降价，优先交换数量、付款和长期合作条件。',
  contract: '合同阶段要确认条款边界，避免口头承诺未落到文本。',
  preparation: '备货阶段强调时间节点、责任分工和异常预案。',
  customs: '报关沟通要突出单证完整性、时间要求和合规风险。',
  settlement: '结算阶段要明确付款条件、账期和单据对应关系。',
  after_sales: '售后阶段先稳住关系，再给出补救动作和后续安排。'
};

const STAGE_RISKS: Record<SimulationStage, string> = {
  acquisition: '可继续追问客户预算、采购周期和决策角色，避免过早推销。',
  quotation: '可补充价格依据、贸易术语、交期和让步交换条件。',
  negotiation: '可避免无条件让步，用数量、付款、交期换取价格空间。',
  contract: '可明确合同条款、违约责任和口头承诺是否写入文本。',
  preparation: '可补充生产节点、质检安排和异常预案。',
  customs: '可明确单证清单、提交时限和合规风险。',
  settlement: '可明确付款金额、币种、到账时间和单据放行条件。',
  after_sales: '可先确认问题事实，再提出补救方案和后续跟进时间。'
};

const STAGE_LABELS: Record<SimulationStage, string> = {
  acquisition: '获客',
  quotation: '报价',
  negotiation: '磋商',
  contract: '合同',
  preparation: '备货',
  customs: '报关',
  settlement: '结算',
  after_sales: '售后'
};

function buildAssessment(input: SimulationOrchestratorInput) {
  const lastStudentMessage = [...input.messages]
    .reverse()
    .find((message) => message.role === 'student');
  const stageLabel = STAGE_LABELS[input.stage];

  return {
    strengths: ['保持了业务场景下的中文沟通练习。'],
    risks: [STAGE_RISKS[input.stage]],
    summary: lastStudentMessage
      ? `当前聚焦${stageLabel}环节。下一轮可以围绕“${lastStudentMessage.content.slice(0, 24)}”继续细化表达。`
      : `当前聚焦${stageLabel}环节。下一轮可以先说明业务目标，再提出可执行方案。`
  };
}

export class CompatibleSimulationProvider implements SimulationProvider {
  async generateReply(
    input: SimulationOrchestratorInput
  ): Promise<SimulationOrchestratorResult> {
    const roleplay = await generateRoleplayReply({
      stage: input.stage,
      messages: input.messages
    });

    return {
      roleplayReply: roleplay.content,
      coachNote: STAGE_COACH_NOTES[input.stage],
      assessment: buildAssessment(input),
      personaSnapshot: {
        difficultyAdjustment: 'keep'
      },
      trace: {
        provider: getAiProviderName(),
        usedTools: [],
        usedWebSearch: false,
        degraded: roleplay.degraded
      }
    };
  }
}
