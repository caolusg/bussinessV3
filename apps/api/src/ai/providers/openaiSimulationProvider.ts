import { generateRoleplayReply } from '../openaiClient.js';
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

function buildAssessment(input: SimulationOrchestratorInput) {
  const lastStudentMessage = [...input.messages]
    .reverse()
    .find((message) => message.role === 'student');

  return {
    strengths: ['保持了业务场景下的中文沟通练习'],
    risks: ['可继续补充价格依据、交付条件或让步交换条件'],
    summary: lastStudentMessage
      ? `当前聚焦 ${input.stage} 环节，可继续围绕“${lastStudentMessage.content.slice(0, 24)}”细化表达。`
      : `当前聚焦 ${input.stage} 环节，下一轮可补强业务解释和谈判策略。`
  };
}

export class OpenAISimulationProvider implements SimulationProvider {
  async generateReply(
    input: SimulationOrchestratorInput
  ): Promise<SimulationOrchestratorResult> {
    const roleplayReply = await generateRoleplayReply({
      stage: input.stage,
      messages: input.messages
    });

    return {
      roleplayReply,
      coachNote: STAGE_COACH_NOTES[input.stage],
      assessment: buildAssessment(input),
      personaSnapshot: {
        difficultyAdjustment: 'keep'
      },
      trace: {
        provider: 'openai',
        usedTools: [],
        usedWebSearch: false
      }
    };
  }
}
