import {
  Stage,
  StageStatus,
  UserProfile,
  TaskDetail,
  TaskMode,
  OpponentProfile,
  ChatMessage,
  CoachingSession,
  DiscussionSession,
  StageResourceSet
} from './types';

export const USER_PROFILE: UserProfile = {
  username: 'zhangming',
  realName: '张明',
  studentNo: 'S0001',
  role: '销售学员',
  company: 'ABC 进出口公司',
  avatarUrl: 'https://picsum.photos/id/64/100/100'
};

export const OPPONENT_PROFILE: OpponentProfile = {
  name: 'David',
  role: '采购总监',
  avatarInitials: 'DA'
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'OPPONENT',
    text: '你好，我是 David。我们可以直接开始这轮业务沟通，请先说明你的方案。',
    timestamp: '10:30'
  }
];

export const MOCK_COACHING_SESSION: CoachingSession = {
  summary:
    '本次复盘重点：学生需要把业务目标、贸易术语和让步条件说清楚，避免只给结论、不解释依据。',
  chatHistory: [
    {
      id: 'cm1',
      sender: 'OPPONENT',
      text: 'Your price is $50? Does it include shipping to London?',
      timestamp: '10:32'
    },
    {
      id: 'cm2',
      sender: 'USER',
      text: '对的，我们的质量很好，这个价格很优惠。',
      timestamp: '10:33',
      isError: true
    },
    {
      id: 'cm3',
      sender: 'OPPONENT',
      text: "No, that's too expensive if I have to pay shipping separately.",
      timestamp: '10:33'
    }
  ],
  annotations: {
    cm2: {
      id: 'a1',
      targetMessageId: 'cm2',
      tags: ['商务策略不足', '答非所问'],
      analysis:
        '客户询问运费归属，回复却只强调质量。国际贸易沟通中，回避成本边界会降低信任。',
      correction:
        '先生，50 美元是 FOB 上海报价。我们承担货物装船前费用，海运费由贵方承担；如果贵方希望我们负责到港运输，也可以改报 CIF 价格。',
      relatedResource: 'FOB/CIF 术语知识卡',
      groupConsensus:
        '小组结论：客户对总成本敏感，应直接说明费用边界，再用质量、交付和售后解释价格合理性。'
    }
  }
};

export const MOCK_GROUP_DISCUSSION: DiscussionSession = {
  caseTitle: '典型商务沟通失败片段复盘',
  items: [
    {
      id: 'item-1',
      sourceMember: '成员 A',
      snippet: '关于运费，我们暂不讨论。让我们先确认产品规格。',
      messages: [
        { id: 'd1', member: '成员 B', content: '回避运费会让客户觉得我们不透明。' },
        { id: 'd2', member: '成员 C', content: '可以先说明 FOB/CIF 的责任边界，再回到规格。' },
        { id: 'd3', member: '成员 A（我）', content: '明白了，术语边界要先讲清楚。', isUser: true }
      ]
    }
  ]
};

const resources = (stageId: number) => [
  { id: `v${stageId}`, title: '商务词汇', type: 'vocabulary' as const },
  { id: `s${stageId}`, title: '常用句式', type: 'phrases' as const },
  { id: `k${stageId}`, title: '外贸常识', type: 'knowledge' as const }
];

export const STAGE_RESOURCES: Record<number, StageResourceSet> = {
  1: {
    vocabulary: [
      { term: '潜在客户', explanation: '可能购买产品或服务、但尚未正式下单的客户。', example: '这位潜在客户主要关注长期供货能力。' },
      { term: '采购需求', explanation: '客户对产品规格、数量、预算和交期的具体要求。', example: '我想先了解一下贵司的采购需求。' },
      { term: '决策人', explanation: '对采购结果有最终决定权的人或部门。', example: '请问这个项目的决策人会一起参加后续会议吗？' },
      { term: '名片交换', explanation: '商务初次见面时交换联系方式和职位信息的礼仪动作。', example: '这是我的名片，欢迎之后随时联系。' }
    ],
    phrases: [
      { term: '请问贵司主要采购哪一类产品？', explanation: '用于自然打开需求确认。' },
      { term: '我们可以先了解您的预算和交付时间要求。', explanation: '把对话从寒暄推进到业务信息。' },
      { term: '如果方便的话，我会在会后发一份产品资料给您。', explanation: '建立后续联系。' },
      { term: '请问后续沟通我应该联系您，还是贵司采购部门？', explanation: '确认对接人和决策链。' }
    ],
    knowledge: [
      { term: '获客目标', explanation: '不是立刻成交，而是判断客户是否匹配、是否值得跟进。' },
      { term: 'B2B 首次沟通', explanation: '重点是专业、简洁、确认需求，不要过早强推价格。' },
      { term: '跟进节奏', explanation: '会后 24 小时内发送资料和会议纪要，能提升客户记忆度。' }
    ]
  },
  2: {
    vocabulary: [
      { term: '报价', explanation: '供应商向客户提出价格、数量、交付和付款条件。', example: '这是我们根据 1000 件数量给出的报价。' },
      { term: '单价', explanation: '每一件或每一单位产品的价格。', example: '这个单价包含包装费用。' },
      { term: 'FOB', explanation: '装运港船上交货，卖方承担货物装船前责任和费用。', example: '我们的报价是 FOB 上海。' },
      { term: 'CIF', explanation: '成本、保险费加运费，卖方负责到目的港的运费和保险。', example: '如果您需要 CIF 伦敦，我们可以重新核算。' }
    ],
    phrases: [
      { term: '这个价格基于 FOB 上海条款。', explanation: '说明报价边界。' },
      { term: '如果订单数量增加，我们可以讨论阶梯价格。', explanation: '保留谈判空间。' },
      { term: '报价包含包装和出厂检验，但不包含目的港清关费用。', explanation: '避免隐性成本争议。' },
      { term: '我可以给您两套方案：标准交期和加急交期。', explanation: '用方案对比替代单一报价。' }
    ],
    knowledge: [
      { term: '报价不只是价格', explanation: '还应包含贸易术语、有效期、付款方式、交期和包装说明。' },
      { term: '有效期', explanation: '报价通常应说明有效期限，避免原材料波动造成风险。' },
      { term: '阶梯价', explanation: '数量越大单价越低，但要明确对应数量区间。' }
    ]
  },
  3: {
    vocabulary: [
      { term: '让步', explanation: '谈判中为了达成交易而放宽某些条件。', example: '价格让步需要和数量承诺绑定。' },
      { term: '底价', explanation: '供应商可以接受的最低价格。', example: '这个价格已经接近我们的底价。' },
      { term: '账期', explanation: '客户付款的延期周期。', example: '如果账期延长，价格需要重新核算。' },
      { term: '长期合作', explanation: '以持续订单换取更好条件的合作方式。', example: '如果是长期合作，我们可以申请特别折扣。' }
    ],
    phrases: [
      { term: '我们可以调整价格，但需要相应增加订单数量。', explanation: '典型的“让步换条件”。' },
      { term: '如果付款条件改为预付 50%，我们可以再优化单价。', explanation: '把价格和现金流绑定。' },
      { term: '这个降幅对我们压力很大，能否从交期或数量上配合？', explanation: '回应压价但不直接拒绝。' },
      { term: '我建议保留质量标准，在包装方式上做成本优化。', explanation: '避免牺牲核心价值。' }
    ],
    knowledge: [
      { term: '谈判核心', explanation: '不要只谈价格，要同时谈数量、付款、交期、服务范围。' },
      { term: '锚定效应', explanation: '先给出合理依据和方案，有助于稳定客户对价格的判断。' },
      { term: '让步原则', explanation: '每一次让步都应换取客户的明确承诺。' }
    ]
  },
  4: {
    vocabulary: [
      { term: '合同条款', explanation: '合同中规定双方权利义务的具体内容。' },
      { term: '违约责任', explanation: '一方未按约履行时需要承担的责任。' },
      { term: '交货日期', explanation: '卖方应完成交付的具体时间。' },
      { term: '争议解决', explanation: '发生纠纷时采用仲裁、诉讼或协商的处理方式。' }
    ],
    phrases: [
      { term: '我们需要把这项承诺写进合同附件。', explanation: '避免口头承诺产生争议。' },
      { term: '请确认交货日期以合同文本为准。', explanation: '强调书面条款。' },
      { term: '付款节点建议写成 30% 预付款，70% 发货前付清。', explanation: '明确付款安排。' },
      { term: '如果延期交付，双方可以按合同约定处理。', explanation: '引入违约责任。' }
    ],
    knowledge: [
      { term: '合同优先级', explanation: '报价单、邮件、合同正文和附件之间应避免冲突。' },
      { term: '签约前确认', explanation: '重点核对品名规格、数量、价格、交期、付款和责任边界。' },
      { term: '附件管理', explanation: '技术规格、包装要求、质检标准最好作为附件保存。' }
    ]
  },
  5: {
    vocabulary: [
      { term: '备货', explanation: '根据订单安排原料、生产、质检和包装。' },
      { term: '生产进度', explanation: '订单生产当前处于哪个节点。' },
      { term: '质检', explanation: '对产品质量进行检查确认。' },
      { term: '延期风险', explanation: '可能导致交付时间推迟的因素。' }
    ],
    phrases: [
      { term: '目前原材料已经到位，预计本周进入批量生产。', explanation: '同步进度。' },
      { term: '我们会在出货前安排最终质检。', explanation: '增强客户信任。' },
      { term: '如果包装材料延迟，我们会提前通知并提供备选方案。', explanation: '主动披露风险。' },
      { term: '我会每两天向您更新一次生产进度。', explanation: '建立沟通节奏。' }
    ],
    knowledge: [
      { term: '备货沟通', explanation: '重点是透明、及时、可预期。' },
      { term: '质检节点', explanation: '常见节点包括来料检验、生产中检验、出货前检验。' },
      { term: '异常预案', explanation: '一旦出现延期苗头，应同时给出原因、影响和替代方案。' }
    ]
  },
  6: {
    vocabulary: [
      { term: '报关', explanation: '向海关申报进出口货物信息。' },
      { term: '商业发票', explanation: '用于说明交易金额、品名、数量等信息的单据。' },
      { term: '装箱单', explanation: '列明包装、件数、重量和体积的单据。' },
      { term: '清关', explanation: '货物在目的国完成海关手续。' }
    ],
    phrases: [
      { term: '请确认商业发票上的品名和金额是否与合同一致。', explanation: '核对单证一致性。' },
      { term: '装箱单需要列明每箱数量、毛重和净重。', explanation: '说明单证细节。' },
      { term: '如果资料今天确认，我们明天可以安排报关。', explanation: '明确时间节点。' },
      { term: '目的港清关资料请贵方提前准备。', explanation: '区分双方责任。' }
    ],
    knowledge: [
      { term: '单证一致', explanation: '合同、发票、装箱单、提单信息不一致会影响清关。' },
      { term: 'HS 编码', explanation: '商品分类编码，影响关税和监管条件。' },
      { term: '报关风险', explanation: '低报价格、品名不清、数量不符都可能导致查验或延误。' }
    ]
  },
  7: {
    vocabulary: [
      { term: '结算', explanation: '双方完成付款、收款和单据交接。' },
      { term: '尾款', explanation: '预付款之外尚未支付的剩余款项。' },
      { term: '付款凭证', explanation: '银行转账或付款完成的证明文件。' },
      { term: '放单', explanation: '在付款或条件满足后交付提货相关单据。' }
    ],
    phrases: [
      { term: '请在发货前付清尾款，我们收到款项后立即放单。', explanation: '明确付款边界。' },
      { term: '麻烦您提供银行付款凭证，便于财务核对。', explanation: '推进结算。' },
      { term: '如果需要延长账期，我们需要重新评估信用额度。', explanation: '处理账期请求。' },
      { term: '款项到账后，我会第一时间通知物流部门。', explanation: '承诺后续动作。' }
    ],
    knowledge: [
      { term: '常见付款方式', explanation: '包括 T/T、电汇、信用证、托收等。' },
      { term: '单据风险', explanation: '未收款先放单可能导致货权和回款风险。' },
      { term: '账期管理', explanation: '账期越长，供应商现金流压力和坏账风险越高。' }
    ]
  },
  8: {
    vocabulary: [
      { term: '售后', explanation: '交易完成后处理质量、使用、补偿等问题。' },
      { term: '破损', explanation: '货物在运输或交付中出现损坏。' },
      { term: '补偿方案', explanation: '为解决客户损失提出的折扣、补发或退款安排。' },
      { term: '责任认定', explanation: '判断问题由生产、包装、运输或客户使用造成。' }
    ],
    phrases: [
      { term: '我们先确认破损数量和照片证据，再给出处理方案。', explanation: '先查事实。' },
      { term: '如果确认是包装问题，我们会承担相应补发责任。', explanation: '表达负责但保留调查。' },
      { term: '为不影响您的销售，我们可以先安排一批替换件。', explanation: '优先降低客户损失。' },
      { term: '我们会把这次问题纳入后续质检改进。', explanation: '体现改进态度。' }
    ],
    knowledge: [
      { term: '售后顺序', explanation: '先安抚，再确认事实，再判断责任，最后提出补救方案。' },
      { term: '证据材料', explanation: '常见材料包括照片、视频、箱唛、批次号、收货记录。' },
      { term: '客户关系', explanation: '售后处理得当可以维护复购和长期合作。' }
    ]
  }
};

export const STAGES: Stage[] = [
  { id: 1, title: '获客 (Client Acquisition)', status: StageStatus.ACTIVE, subResources: resources(1) },
  { id: 2, title: '报价 (Quotation)', status: StageStatus.ACTIVE, subResources: resources(2) },
  { id: 3, title: '磋商 (Negotiation)', status: StageStatus.ACTIVE, subResources: resources(3) },
  { id: 4, title: '合同 (Contract)', status: StageStatus.ACTIVE, subResources: resources(4) },
  { id: 5, title: '备货 (Preparation)', status: StageStatus.ACTIVE, subResources: resources(5) },
  { id: 6, title: '报关 (Customs)', status: StageStatus.ACTIVE, subResources: resources(6) },
  { id: 7, title: '结算 (Settlement)', status: StageStatus.ACTIVE, subResources: resources(7) },
  { id: 8, title: '售后 (After-sales)', status: StageStatus.ACTIVE, subResources: resources(8) }
];

export const SCENARIO_DB: Record<number, TaskDetail> = {
  1: {
    stageId: 1,
    mode: TaskMode.PENDING,
    title: '获客 (Client Acquisition)',
    taskId: 'CA-2026-A01',
    description: '在展会上首次接触潜在客户，完成寒暄、需求确认、名片交换和后续联系约定。',
    feedbackOrTipTitle: '表现亮点',
    feedbackOrTipContent: '你完成了基本商务礼仪，并且能主动确认客户采购方向。后续可以继续追问预算、决策周期和采购角色。'
  },
  2: {
    stageId: 2,
    mode: TaskMode.PENDING,
    title: '报价 (Quotation)',
    taskId: 'QT-2026-X89',
    description: '向客户给出初步报价，并解释价格构成、贸易术语和可谈判空间。',
    subDescription: '建议包含 FOB/CIF 责任边界、数量阶梯价和交付周期。',
    feedbackOrTipTitle: 'AI 商务教练提示',
    feedbackOrTipContent: '不要只报一个数字。先说明价格包含哪些服务，再给出可调整条件，例如数量、账期或长期合作折扣。'
  },
  3: {
    stageId: 3,
    mode: TaskMode.PENDING,
    title: '磋商 (Negotiation)',
    taskId: 'NG-2026-B12',
    description: '面对客户压价或附加条件，寻找双方都能接受的折中方案。',
    subDescription: '重点练习“让步换条件”：降价应换取数量、付款或交期承诺。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '先确认客户最在意的是价格、交期、质量还是付款条件，再提出两套备选方案。'
  },
  4: {
    stageId: 4,
    mode: TaskMode.PENDING,
    title: '合同 (Contract)',
    taskId: 'CT-2026-C04',
    description: '把已谈妥的价格、数量、交付、付款和违约责任落实到合同条款。',
    subDescription: '重点练习确认条款边界，避免口头承诺没有写进合同。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '合同沟通要逐条确认：品名规格、单价总价、贸易术语、交货日期、付款节点和争议解决方式。'
  },
  5: {
    stageId: 5,
    mode: TaskMode.PENDING,
    title: '备货 (Preparation)',
    taskId: 'PR-2026-D05',
    description: '向客户同步生产进度、质检安排和可能的交付风险。',
    subDescription: '重点练习在出现延期或质量问题苗头时，如何提前沟通。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '备货阶段要给出明确时间节点：原料到位、生产完成、质检、包装、装运准备。'
  },
  6: {
    stageId: 6,
    mode: TaskMode.PENDING,
    title: '报关 (Customs)',
    taskId: 'CU-2026-E06',
    description: '处理发票、装箱单、报关资料和客户对清关时间的追问。',
    subDescription: '重点练习解释单证要求、合规风险和资料补交时限。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '报关沟通要避免含糊。请说明需要哪些文件、由谁提供、最晚什么时候提交。'
  },
  7: {
    stageId: 7,
    mode: TaskMode.PENDING,
    title: '结算 (Settlement)',
    taskId: 'ST-2026-F07',
    description: '围绕尾款、账期、付款凭证和单据放行进行商务沟通。',
    subDescription: '重点练习在维护客户关系的同时坚持付款边界。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '结算阶段要把付款条件说清楚：金额、币种、到账时间、凭证要求和逾期处理。'
  },
  8: {
    stageId: 8,
    mode: TaskMode.PENDING,
    title: '售后 (After-sales)',
    taskId: 'AS-2026-G08',
    description: '处理客户关于质量、破损、延迟或补偿的售后反馈。',
    subDescription: '重点练习先安抚关系，再确认事实、提出补救方案和后续改进。',
    feedbackOrTipTitle: '开始前提示',
    feedbackOrTipContent: '售后沟通不要急于推责。先确认问题和证据，再给出可执行的补救时间表。'
  }
};
