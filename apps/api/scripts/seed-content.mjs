import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['error'] });

const stages = [
  ['acquisition', 1, '获客', 'Client Acquisition', '在展会或初次接触中识别潜在客户并建立后续联系。'],
  ['quotation', 2, '报价', 'Quotation', '向客户说明价格、贸易术语、交期和可谈判空间。'],
  ['negotiation', 3, '磋商', 'Negotiation', '围绕价格、数量、付款、交期等条件进行谈判。'],
  ['contract', 4, '合同', 'Contract', '把已谈妥的商业条件落实到合同条款。'],
  ['preparation', 5, '备货', 'Preparation', '同步生产、质检、包装和交付准备。'],
  ['customs', 6, '报关', 'Customs', '处理报关资料、单证一致性和清关风险。'],
  ['settlement', 7, '结算', 'Settlement', '围绕尾款、账期、付款凭证和单据放行沟通。'],
  ['after_sales', 8, '售后', 'After-sales', '处理质量、破损、延迟或补偿等售后问题。']
];

const tasks = {
  acquisition: {
    taskCode: 'CA-2026-A01',
    title: '获客 (Client Acquisition)',
    goal: '在展会上首次接触潜在客户，完成寒暄、需求确认、名片交换和后续联系约定。',
    subGoal: null,
    tipTitle: '练习提示',
    tipContent: '你需要主动确认客户采购方向，并继续追问预算、决策周期和采购角色。'
  },
  quotation: {
    taskCode: 'QT-2026-X89',
    title: '报价 (Quotation)',
    goal: '向客户给出初步报价，并解释价格构成、贸易术语和可谈判空间。',
    subGoal: '建议包含 FOB/CIF 责任边界、数量阶梯价和交付周期。',
    tipTitle: 'AI 商务教练提示',
    tipContent: '不要只报一个数字。先说明价格包含哪些服务，再给出可调整条件，例如数量、账期或长期合作折扣。'
  },
  negotiation: {
    taskCode: 'NG-2026-B12',
    title: '磋商 (Negotiation)',
    goal: '面对客户压价或附加条件，寻找双方都能接受的折中方案。',
    subGoal: '重点练习“让步换条件”：降价应换取数量、付款或交期承诺。',
    tipTitle: '开始前提示',
    tipContent: '先确认客户最在意的是价格、交期、质量还是付款条件，再提出两套备选方案。'
  },
  contract: {
    taskCode: 'CT-2026-C04',
    title: '合同 (Contract)',
    goal: '把已谈妥的价格、数量、交付、付款和违约责任落实到合同条款。',
    subGoal: '重点练习确认条款边界，避免口头承诺没有写进合同。',
    tipTitle: '开始前提示',
    tipContent: '合同沟通要逐条确认：品名规格、单价总价、贸易术语、交货日期、付款节点和争议解决方式。'
  },
  preparation: {
    taskCode: 'PR-2026-D05',
    title: '备货 (Preparation)',
    goal: '向客户同步生产进度、质量检查安排和可能的交付风险。',
    subGoal: '重点练习在出现延期或质量问题苗头时，如何提前沟通。',
    tipTitle: '开始前提示',
    tipContent: '备货阶段要给出明确时间节点：原料到位、生产完成、质检、包装、装运准备。'
  },
  customs: {
    taskCode: 'CU-2026-E06',
    title: '报关 (Customs)',
    goal: '处理发票、装箱单、报关资料和客户对清关时间的追问。',
    subGoal: '重点练习解释单证要求、合规风险和资料补交时限。',
    tipTitle: '开始前提示',
    tipContent: '报关沟通要避免含糊。请说明需要哪些文件、由谁提供、最晚什么时候提交。'
  },
  settlement: {
    taskCode: 'ST-2026-F07',
    title: '结算 (Settlement)',
    goal: '围绕尾款、账期、付款凭证和单据放行进行商务沟通。',
    subGoal: '重点练习在维护客户关系的同时坚持付款边界。',
    tipTitle: '开始前提示',
    tipContent: '结算阶段要把付款条件说清楚：金额、币种、到账时间、凭证要求和逾期处理。'
  },
  after_sales: {
    taskCode: 'AS-2026-G08',
    title: '售后 (After-sales)',
    goal: '处理客户关于质量、破损、延迟或补偿的售后反馈。',
    subGoal: '重点练习先安抚关系，再确认事实、提出补救方案和后续改进。',
    tipTitle: '开始前提示',
    tipContent: '售后沟通不要急于推责。先确认问题和证据，再给出可执行的补救时间表。'
  }
};

const resource = (type, term, explanation, example = null) => ({
  type,
  term,
  explanation,
  example
});

const resources = {
  acquisition: [
    resource('vocabulary', '潜在客户', '可能购买产品或服务、但尚未正式下单的客户。', '这位潜在客户主要关注长期供货能力。'),
    resource('vocabulary', '采购需求', '客户对产品规格、数量、预算和交期的具体要求。', '我想先了解一下贵司的采购需求。'),
    resource('phrases', '请问贵司主要采购哪一类产品？', '用于自然打开需求确认。'),
    resource('phrases', '如果方便的话，我会在会后发一份产品资料给您。', '建立后续联系。'),
    resource('knowledge', '获客目标', '不是立刻成交，而是判断客户是否匹配、是否值得跟进。'),
    resource('knowledge', '跟进节奏', '会后 24 小时内发送资料和会议纪要，能提升客户记忆度。')
  ],
  quotation: [
    resource('vocabulary', 'FOB', '装运港船上交货，卖方承担货物装船前责任和费用。', '我们的报价是 FOB 上海。'),
    resource('vocabulary', 'CIF', '成本、保险费加运费，卖方负责到目的港的运费和保险。', '如果您需要 CIF 伦敦，我们可以重新核算。'),
    resource('phrases', '这个价格基于 FOB 上海条款。', '说明报价边界。'),
    resource('phrases', '如果订单数量增加，我们可以讨论阶梯价格。', '保留谈判空间。'),
    resource('knowledge', '报价不只是价格', '还应包含贸易术语、有效期、付款方式、交期和包装说明。'),
    resource('knowledge', '阶梯价', '数量越大单价越低，但要明确对应数量区间。')
  ],
  negotiation: [
    resource('vocabulary', '让步', '谈判中为了达成交易而放宽某些条件。', '价格让步需要和数量承诺绑定。'),
    resource('vocabulary', '账期', '客户付款的延后期限。', '如果账期延长，价格需要重新核算。'),
    resource('phrases', '我们可以调整价格，但需要相应增加订单数量。', '典型“让步换条件”。'),
    resource('phrases', '这个降幅对我们压力很大，能否从交期或数量上配合？', '回应压价但不直接拒绝。'),
    resource('knowledge', '谈判核心', '不要只谈价格，要同时谈数量、付款、交期、服务范围。'),
    resource('knowledge', '让步原则', '每一次让步都应换取客户的明确承诺。')
  ],
  contract: [
    resource('vocabulary', '合同条款', '合同中规定双方权利义务的具体内容。'),
    resource('vocabulary', '违约责任', '一方未按约履行时需要承担的责任。'),
    resource('phrases', '我们需要把这项承诺写进合同附件。', '避免口头承诺产生争议。'),
    resource('phrases', '请确认交货日期以合同文本为准。', '强调书面条款。'),
    resource('knowledge', '合同优先级', '报价单、邮件、合同正文和附件之间应避免冲突。'),
    resource('knowledge', '附件管理', '技术规格、包装要求、质检标准最好作为附件保存。')
  ],
  preparation: [
    resource('vocabulary', '备货', '根据订单安排原料、生产、质检和包装。'),
    resource('vocabulary', '延期风险', '可能导致交付时间推迟的因素。'),
    resource('phrases', '目前原材料已经到位，预计本周进入批量生产。', '同步进度。'),
    resource('phrases', '我们会在出货前安排最终质检。', '增强客户信任。'),
    resource('knowledge', '备货沟通', '重点是透明、及时、可预期。'),
    resource('knowledge', '异常预案', '一旦出现延期苗头，应同时给出原因、影响和替代方案。')
  ],
  customs: [
    resource('vocabulary', '报关', '向海关申报进出口货物信息。'),
    resource('vocabulary', '装箱单', '列明包装、件数、重量和体积的单据。'),
    resource('phrases', '请确认商业发票上的品名和金额是否与合同一致。', '核对单证一致性。'),
    resource('phrases', '如果资料今天确认，我们明天可以安排报关。', '明确时间节点。'),
    resource('knowledge', '单证一致', '合同、发票、装箱单、提单信息不一致会影响清关。'),
    resource('knowledge', '报关风险', '低报价格、品名不清、数量不符都可能导致查验或延误。')
  ],
  settlement: [
    resource('vocabulary', '结算', '双方完成付款、收款和单据交接。'),
    resource('vocabulary', '放单', '在付款或条件满足后交付提货相关单据。'),
    resource('phrases', '请在发货前付清尾款，我们收到款项后立即放单。', '明确付款边界。'),
    resource('phrases', '麻烦您提供银行付款凭证，便于财务核对。', '推进结算。'),
    resource('knowledge', '常见付款方式', '包括 T/T、电汇、信用证、托收等。'),
    resource('knowledge', '单据风险', '未收款先放单可能导致货权和回款风险。')
  ],
  after_sales: [
    resource('vocabulary', '售后', '交易完成后处理质量、使用、补偿等问题。'),
    resource('vocabulary', '责任认定', '判断问题由生产、包装、运输或客户使用造成。'),
    resource('phrases', '我们先确认破损数量和照片证据，再给出处理方案。', '先查事实。'),
    resource('phrases', '如果确认是包装问题，我们会承担相应补发责任。', '表达负责但保留调查。'),
    resource('knowledge', '售后顺序', '先安抚，再确认事实，再判断责任，最后提出补救方案。'),
    resource('knowledge', '证据材料', '常见材料包括照片、视频、箱唛、批次号、收货记录。')
  ]
};

const prompts = {
  acquisition: '当前是获客阶段。你扮演潜在客户，应关注供应商是否理解需求、是否专业、是否值得后续联系。',
  quotation: '当前是报价阶段。你扮演采购方，应关注价格构成、贸易术语、交付周期和让步空间。',
  negotiation: '当前是磋商阶段。你扮演强势采购方，应围绕价格、数量、付款和交期提出压力。',
  contract: '当前是合同阶段。你扮演客户法务/采购负责人，应追问条款边界、违约责任和口头承诺。',
  preparation: '当前是备货阶段。你扮演客户，应关注生产进度、质检安排和延期风险。',
  customs: '当前是报关阶段。你扮演客户，应关注单证是否齐全、清关时限和合规风险。',
  settlement: '当前是结算阶段。你扮演客户财务/采购方，应围绕付款节点、尾款、单据放行提出问题。',
  after_sales: '当前是售后阶段。你扮演遇到问题的客户，应关注事实确认、补救方案、赔偿和后续改进。'
};

const main = async () => {
  for (const [key, sortOrder, titleZh, titleEn, description] of stages) {
    const stage = await prisma.businessStage.upsert({
      where: { key },
      update: { sortOrder, titleZh, titleEn, description, isActive: true },
      create: { key, sortOrder, titleZh, titleEn, description, isActive: true }
    });

    const task = tasks[key];
    await prisma.stageTask.upsert({
      where: { taskCode: task.taskCode },
      update: { stageId: stage.id, ...task, isDefault: true, isActive: true },
      create: { stageId: stage.id, ...task, isDefault: true, isActive: true }
    });

    for (const [index, item] of resources[key].entries()) {
      await prisma.learningResource.upsert({
        where: {
          stageId_type_term: {
            stageId: stage.id,
            type: item.type,
            term: item.term
          }
        },
        update: {
          explanation: item.explanation,
          example: item.example,
          sortOrder: index,
          isActive: true
        },
        create: {
          stageId: stage.id,
          type: item.type,
          term: item.term,
          explanation: item.explanation,
          example: item.example,
          sortOrder: index,
          isActive: true
        }
      });
    }

    const scenarioData = {
      name: `${titleZh}默认对手`,
      opponentName: 'David',
      opponentRole: '采购总监',
      systemPrompt: [
        '你是国际贸易场景里的客户/采购方角色扮演对象。',
        prompts[key],
        '必须用中文回复。请基于学生刚才的话，直接给出自然、简洁、带有商务压力的对手回复。',
        '不要写成教练建议，不要解释你在扮演角色。'
      ].join('\n'),
      difficulty: 'standard',
      promptVersion: 'v1',
      isDefault: true,
      isActive: true
    };

    const existingScenario = await prisma.stageAiScenario.findFirst({
      where: { stageId: stage.id, isDefault: true }
    });

    if (existingScenario) {
      await prisma.stageAiScenario.update({
        where: { id: existingScenario.id },
        data: scenarioData
      });
    } else {
      await prisma.stageAiScenario.create({
        data: {
          stageId: stage.id,
          ...scenarioData
        }
      });
    }
  }

  console.log('Content seed completed');
};

main()
  .catch((error) => {
    console.error('Content seed failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
