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

const NEXT_STAGE: Partial<Record<SimulationStage, SimulationStage>> = {
  acquisition: 'quotation',
  quotation: 'negotiation',
  negotiation: 'contract',
  contract: 'preparation',
  preparation: 'customs',
  customs: 'settlement',
  settlement: 'after_sales'
};

const NEXT_STAGE_INTENT_KEYWORDS: Partial<Record<SimulationStage, string[]>> = {
  acquisition: ['报价', '价格', '多少钱', '单价', '签合同', '合同', '付款', '下单'],
  quotation: ['压价', '降价', '让步', '合同', '签约', '付款', '生产', '备货'],
  negotiation: ['合同', '签约', '条款', '备货', '生产', '报关', '付款'],
  contract: ['生产', '备货', '发货', '报关', '清关', '付款', '尾款'],
  preparation: ['报关', '清关', '发票', '装箱单', '付款', '尾款', '售后'],
  customs: ['付款', '尾款', '放单', '结算', '售后', '赔偿'],
  settlement: ['售后', '质量问题', '破损', '赔偿', '补发']
};

const STAGE_BOUNDARY_RULES: Record<SimulationStage, string> = {
  acquisition: '只围绕初次接触、客户需求、采购背景、决策角色、联系方式和后续跟进展开。即使学生提出报价、谈判、签合同或付款，也不要进入那些环节；请自然拉回获客阶段，例如先要求确认需求、预算范围、决策流程或会后资料。',
  quotation: '只围绕报价信息、价格构成、贸易术语、数量阶梯、交期、报价有效期和报价澄清展开。即使学生提出压价谈判、合同签署、备货或付款，也不要进入那些环节；请自然拉回报价阶段，例如要求先说明报价依据或报价边界。',
  negotiation: '只围绕价格、数量、付款方式、交期、让步交换和双方条件拉扯展开。即使学生提出签合同、生产备货、报关或售后，也不要进入那些环节；请自然拉回磋商阶段，例如继续追问可交换条件。',
  contract: '只围绕合同条款、附件、规格、交付责任、违约责任、争议解决和书面确认展开。即使学生提出生产、报关、结算或售后，也不要进入那些环节；请自然拉回合同阶段，例如要求把承诺写清楚。',
  preparation: '只围绕生产进度、原料、质检、包装、装运准备、延期风险和异常预案展开。即使学生提出报关、付款或售后处理，也不要进入那些环节；请自然拉回备货阶段，例如追问时间节点和质检安排。',
  customs: '只围绕发票、装箱单、报关资料、单证一致性、清关时限和合规风险展开。即使学生提出付款放单或售后赔偿，也不要进入那些环节；请自然拉回报关阶段，例如要求确认单证和提交时间。',
  settlement: '只围绕付款节点、尾款、账期、付款凭证、放单条件和财务核对展开。即使学生提出售后补偿或重新谈判，也不要进入那些环节；请自然拉回结算阶段，例如要求明确付款安排。',
  after_sales: '只围绕质量问题、破损、延迟、证据确认、责任认定、补救方案和后续改进展开。不要回到获客、报价、合同等前序环节；请自然拉回售后阶段，例如要求确认问题事实和处理时间表。'
};

function buildStageBoundaryPrompt(stage: SimulationStage) {
  return [
    `当前练习阶段是「${STAGE_LABELS[stage]}」。你必须严格停留在这个阶段。`,
    STAGE_BOUNDARY_RULES[stage],
    '如果学生表达已经成交、签约、付款、发货或跳到其他阶段，你不能顺着推进剧情，也不能替学生完成跨阶段结果；要以客户身份把话题拉回当前阶段需要确认的事项。',
    '回复只能是一段客户/采购方的自然对话，不要说明规则，不要评价学生。'
  ].join('\n');
}

function buildCoachNote(input: SimulationOrchestratorInput) {
  const baseNote = STAGE_COACH_NOTES[input.stage];
  const nextStage = NEXT_STAGE[input.stage];
  if (!nextStage) return baseNote;

  const studentMessages = input.messages.filter((message) => message.role === 'student');
  const latestStudentContent = studentMessages.at(-1)?.content ?? '';
  const mentionsNextStage = (NEXT_STAGE_INTENT_KEYWORDS[input.stage] ?? []).some((keyword) =>
    latestStudentContent.includes(keyword)
  );
  const enoughPracticeTurns = studentMessages.length >= 4;

  if (!mentionsNextStage && !enoughPracticeTurns) return baseNote;

  return [
    baseNote,
    `这个${STAGE_LABELS[input.stage]}阶段已经练得差不多了。可以结束当前对话，切换到「${STAGE_LABELS[nextStage]}」阶段继续练习。`
  ].join(' ');
}

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
    const productCatalogContext = input.productCatalogContext?.trim();
    const systemPrompt = [
      input.scenario?.systemPrompt,
      buildStageBoundaryPrompt(input.stage),
      productCatalogContext
        ? [
            '以下是我方上传的产品目录资料。你扮演客户时必须阅读并参考这些产品信息。',
            '客户可以围绕产品类别、型号、规格、价格、目录内容、交付或采购需求提出更具体的问题。',
            '不要逐字复述目录；要像真实采购方一样基于目录信息追问、比较或要求澄清。',
            productCatalogContext
          ].join('\n')
        : null
    ].filter(Boolean).join('\n\n');

    const roleplay = await generateRoleplayReply({
      stage: input.stage,
      messages: input.messages,
      systemPrompt
    });

    return {
      roleplayReply: roleplay.content,
      coachNote: buildCoachNote(input),
      assessment: buildAssessment(input),
      personaSnapshot: {
        difficultyAdjustment: 'keep'
      },
      trace: {
        provider: getAiProviderName(),
        usedTools: productCatalogContext ? ['product_catalog_context'] : [],
        usedWebSearch: false,
        degraded: roleplay.degraded,
        promptVersion: input.scenario?.promptVersion ?? 'v1',
        scenarioId: input.scenario?.id ?? null
      }
    };
  }
}
