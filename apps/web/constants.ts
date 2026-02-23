import { Stage, StageStatus, UserProfile, TaskDetail, TaskMode, OpponentProfile, ChatMessage, CoachingSession, DiscussionSession } from './types';

// Added missing required property 'username' to match UserProfile interface
export const USER_PROFILE: UserProfile = {
  username: 'zhangming',
  realName: '张明',
  studentNo: 'S0001',
  role: '销售',
  company: 'ABC进出口公司',
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
    text: "Mr. Zhang, I've reviewed your quotation. To be honest, your price is significantly higher than our target. We have other suppliers offering 10% less.",
    timestamp: '10:30'
  }
];

export const MOCK_COACHING_SESSION: CoachingSession = {
  summary: '张明，本次沟通失败的主要原因是：未解释 FOB 术语含义，导致客户对隐形成本担忧。请在报价时说明构成与风险边界。',
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
      text: "No, that's too expensive if I have to pay shipping separately. I can't accept this uncertainty.",
      timestamp: '10:33'
    }
  ],
  annotations: {
    cm2: {
      id: 'a1',
      targetMessageId: 'cm2',
      tags: ['商务策略错误', '答非所问'],
      analysis: '客户询问运费归属，你却谈论质量。在国际贸易中，回避运费会显得不专业，增加客户疑虑。AI 诊断核心：FOB/CIF 条款不明确。',
      correction: '先生，50 美元是我们的底价。此报价基于 **FOB 上海** 术语，即我们承担货物上船前费用，运费由贵方承担。但我们的质量与交付保障完全匹配该价格。',
      relatedResource: 'FOB 术语知识单',
      groupConsensus: '小组结论：客户对总成本敏感，回避价格构成会导致信任下降，应直接说明运费归属。'
    }
  }
};

export const MOCK_GROUP_DISCUSSION: DiscussionSession = {
  caseTitle: '典型商务沟通“失败片段”深度研讨',
  items: [
    {
      id: 'item-1',
      sourceMember: '成员 A (张明)',
      snippet: '先生您好！欢迎来到比亚迪。这款 E6 是我们的最新设计，外形时尚，开出去很有面子，很适合您这样的成功人士。',
      messages: [
        { id: 'd1', member: '成员 B', content: '这句话听着很顺耳，但太营销化了。客户不一定买账。' },
        { id: 'd2', member: '成员 C', content: '注意客户动作：一上来就看后备箱和后排座椅，可能是运营用途。' },
        { id: 'd3', member: '成员 D', content: '对，而且他名片是 SEA Transport，更像是采购运营用途。' },
        { id: 'd4', member: '成员 E', content: '如果用于运营，强调“奢侈感”反而减分。' },
        { id: 'd5', member: '成员 A (你)', content: '我懂了，我把他当成家用客户了。', isUser: true }
      ]
    },
    {
      id: 'item-2',
      sourceMember: '成员 C',
      snippet: '关于运费，我们暂不讨论。让我们先确认产品规格。相信我，运费只是小事。',
      messages: [
        { id: 'd6', member: '成员 A', content: '回避运费太明显，客户对总成本很敏感。' },
        { id: 'd7', member: '成员 D', content: '运费归属决定风险划分（FOB/CIF），不谈会让客户不信任。' },
        { id: 'd8', member: '成员 B', content: '如果不谈运费，客户无法算到岸价与预算。' },
        { id: 'd9', member: '成员 C (你)', content: '确实，价格条款本身就是价值的一部分。', isUser: true }
      ]
    }
  ]
};

export const STAGES: Stage[] = [
  {
    id: 1,
    title: '获客 (Client Acquisition)',
    status: StageStatus.COMPLETED,
    subResources: [
      { id: 'v1', title: '商务词汇' },
      { id: 's1', title: '常用句式' },
      { id: 'k1', title: '外贸常识' }
    ]
  },
  {
    id: 2,
    title: '报价 (Quotation)',
    status: StageStatus.ACTIVE,
    subResources: [
      { id: 'v2', title: '商务词汇' },
      { id: 's2', title: '常用句式' },
      { id: 'k2', title: '外贸常识' }
    ]
  },
  {
    id: 3,
    title: '磋商 (Negotiation)',
    status: StageStatus.ACTIVE,
    subResources: [
      { id: 'v3', title: '商务词汇' },
      { id: 's3', title: '常用句式' },
      { id: 'k3', title: '外贸常识' }
    ]
  },
  {
    id: 4,
    title: '合同 (Contract)',
    status: StageStatus.LOCKED,
    subResources: [
      { id: 'v4', title: '商务词汇' },
      { id: 's4', title: '常用句式' },
      { id: 'k4', title: '外贸常识' }
    ]
  },
  {
    id: 5,
    title: '备货 (Preparation)',
    status: StageStatus.LOCKED,
    subResources: [
      { id: 'v5', title: '商务词汇' },
      { id: 's5', title: '常用句式' },
      { id: 'k5', title: '外贸常识' }
    ]
  },
  {
    id: 6,
    title: '报关 (Customs)',
    status: StageStatus.LOCKED,
    subResources: [
      { id: 'v6', title: '商务词汇' },
      { id: 's6', title: '常用句式' },
      { id: 'k6', title: '外贸常识' }
    ]
  },
  {
    id: 7,
    title: '结算 (Settlement)',
    status: StageStatus.LOCKED,
    subResources: [
      { id: 'v7', title: '商务词汇' },
      { id: 's7', title: '常用句式' },
      { id: 'k7', title: '外贸常识' }
    ]
  },
  {
    id: 8,
    title: '售后 (After-sales)',
    status: StageStatus.LOCKED,
    subResources: [
      { id: 'v8', title: '商务词汇' },
      { id: 's8', title: '常用句式' },
      { id: 'k8', title: '外贸常识' }
    ]
  }
];

export const SCENARIO_DB: Record<number, TaskDetail> = {
  1: {
    stageId: 1,
    mode: TaskMode.COMPLETED,
    title: '获客 (Client Acquisition)',
    taskId: 'CA-2023-A01',
    attemptCount: 1,
    maxAttempts: 3,
    description: '在展会上首次接触潜在客户，交换名片并建立初步联系。',
    feedbackOrTipTitle: '表现亮点',
    feedbackOrTipContent: '你在寒暄环节表现得体，使用了恰当的商务礼仪，名片交换动作规范。'
  },
  2: {
    stageId: 2,
    mode: TaskMode.IN_PROGRESS,
    title: '报价 (Quotation)',
    taskId: 'QT-2023-X89',
    attemptCount: 2,
    maxAttempts: 3,
    description: '向客户给出底价，并解释费用构成。',
    subDescription: '需包含 FOB 术语说明及运费预估。',
    feedbackOrTipTitle: 'AI 商务教练复盘',
    feedbackOrTipContent: '上次失败原因：你只报了数字，没有解释 FOB 术语含义，客户认为运费由他承担，产生顾虑。'
  },
  3: {
    stageId: 3,
    mode: TaskMode.PENDING,
    title: '磋商 (Negotiation)',
    taskId: 'NG-2023-B12',
    attemptCount: 0,
    maxAttempts: 3,
    description: '针对价格分歧进行谈判，寻找双方都能接受的折中方案。',
    feedbackOrTipContent: ''
  }
};
