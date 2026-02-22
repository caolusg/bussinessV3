
import { Stage, StageStatus, UserProfile, TaskDetail, TaskMode, OpponentProfile, ChatMessage, CoachingSession, DiscussionSession } from './types';

// Added missing required property 'username' to match UserProfile interface
export const USER_PROFILE: UserProfile = {
  username: "zhangming",
  name: "张明",
  role: "销售",
  company: "ABC进出口公司",
  avatarUrl: "https://picsum.photos/id/64/100/100"
};

export const OPPONENT_PROFILE: OpponentProfile = {
  name: "David",
  role: "采购总监",
  avatarInitials: "DA"
};

export const INITIAL_CHAT_MESSAGES: ChatMessage[] = [
  {
    id: 'm1',
    sender: 'OPPONENT',
    text: "Mr. Zhang, I've reviewed your quotation. To be honest, your price is significantly higher than our target. We have other suppliers offering 10% less.",
    timestamp: "10:30"
  }
];

export const MOCK_COACHING_SESSION: CoachingSession = {
  summary: "张明，本次沟通破裂的主要原因是：缺乏对 FOB 术语的明确界定，导致客户对隐形成本产生恐慌。虽然你们在小组讨论中意识到了沟通层级的问题，但对具体的贸易术语风险划分仍有偏差。",
  chatHistory: [
    {
      id: 'cm1',
      sender: 'OPPONENT',
      text: "Your price is $50? Does it include shipping to London?",
      timestamp: "10:32"
    },
    {
      id: 'cm2',
      sender: 'USER',
      text: "对的，我们的质量很好，这个价格很便宜了。",
      timestamp: "10:33",
      isError: true
    },
    {
      id: 'cm3',
      sender: 'OPPONENT',
      text: "No, that's too expensive if I have to pay shipping separately. I can't accept this uncertainty.",
      timestamp: "10:33"
    }
  ],
  annotations: {
    'cm2': {
      id: 'a1',
      targetMessageId: 'cm2',
      tags: ['商务策略失误', '答非所问'],
      analysis: "客户询问运费归属，你却谈论质量。在国际贸易中，避谈运费会显得不专业，加深客户的疑虑。AI 诊断核心：FOB/CIF 条款不明确。",
      correction: "大卫先生，50美金是我们的底价。此报价基于 **FOB 上海** 术语，也就是我们承担货物上船前的费用，运费由贵方承担。但我们的质量绝对配得上这个价格。",
      relatedResource: "FOB术语知识卡",
      groupConsensus: "小组结论：用户是采购总监，对总成本（Total Cost）极度敏感，回避价格构成会导致信任崩塌。应直接回答运费归属。"
    }
  }
};

export const MOCK_GROUP_DISCUSSION: DiscussionSession = {
  caseTitle: "典型商务沟通“失败片段”深度研讨",
  items: [
    {
      id: 'item-1',
      sourceMember: '组员 A (张明)',
      snippet: "先生您好！欢迎来到比亚迪。这款 E6 是我们最新的设计，外形特别时尚，开出去特别有面子，很适合您这样的成功人士。",
      messages: [
        { id: 'd1', member: '组员 B', content: '哎，这句话听着挺顺耳的啊，咱们平时去 4S 店买车，销售不都这么夸吗？为什么赵总不满意？' },
        { id: 'd2', member: '组员 C', content: '你们注意赵总的动作了吗？他一上来就看后备箱，还试坐后排座椅。如果是买来自己开这种“有面子”的车，谁会一上来就去看后备箱 and 后排座椅？' },
        { id: 'd3', member: '组员 D', content: '对！而且他胸牌上公司名是“SEA Transport”。我觉得他根本不是买来自己开的。' },
        { id: 'd4', member: '组员 E', content: '有道理。如果他是买回去做运营（比如出租车），“时尚”反而是累赘，看着像花瓶，感觉不耐用啊。' },
        { id: 'd5', member: '组员 A (你)', content: '我懂了！我把他当成买家用的散户了。他需要的是“工具车”，我却在推销“奢侈品”。', isUser: true },
      ]
    },
    {
      id: 'item-2',
      sourceMember: '组员 C',
      snippet: "关于运费，我们暂不讨论。让我们先确定产品规格。相信我，运费只是小事。",
      messages: [
        { id: 'd6', member: '组员 A', content: 'C，你这里回避运费太明显了，David 是采购经理，他对总成本（Total Cost）非常敏感。' },
        { id: 'd7', member: '组员 D', content: '对的，在国际贸易里，运费归属决定了风险划分（FOB/CIF）。你不谈运费，他会觉得你在挖坑。' },
        { id: 'd8', member: '组员 B', content: '质疑一下：如果不谈运费，他怎么计算到岸价？他没法做财务预估啊。' },
        { id: 'd9', member: '组员 C (你)', content: '确实。我原本想先推产品价值，但在 B2B 里，价格条款本身就是价值的一部分。', isUser: true }
      ]
    }
  ]
};

export const STAGES: Stage[] = [
  {
    id: 1,
    title: "获客 (Client Acquisition)",
    status: StageStatus.COMPLETED,
    subResources: [{id: 'v1', title: '商务词汇'}, {id: 's1', title: '常用句式'}, {id: 'k1', title: '外贸常识'}]
  },
  {
    id: 2,
    title: "报价 (Quotation)",
    status: StageStatus.ACTIVE,
    subResources: [{id: 'v2', title: '报价策略词汇'}, {id: 's2', title: 'FOB/CIF句式'}, {id: 'k2', title: '价格构成解析'}]
  },
  {
    id: 3,
    title: "磋商 (Negotiation)",
    status: StageStatus.ACTIVE,
    subResources: [{id: 'v3', title: '商务词汇'}, {id: 's3', title: '常用句式'}, {id: 'k3', title: '外贸常识'}]
  },
  {
    id: 4,
    title: "合同 (Contract)",
    status: StageStatus.LOCKED,
    subResources: [{id: 'v4', title: '商务词汇'}, {id: 's4', title: '常用句式'}, {id: 'k4', title: '外贸常识'}]
  },
  {
    id: 5,
    title: "备货 (Preparation)",
    status: StageStatus.LOCKED,
    subResources: [{id: 'v5', title: '商务词汇'}, {id: 's5', title: '常用句式'}, {id: 'k5', title: '外贸常识'}]
  },
  {
    id: 6,
    title: "报关 (Customs)",
    status: StageStatus.LOCKED,
    subResources: [{id: 'v6', title: '商务词汇'}, {id: 's6', title: '常用句式'}, {id: 'k6', title: '外贸常识'}]
  },
  {
    id: 7,
    title: "结算 (Settlement)",
    status: StageStatus.LOCKED,
    subResources: [{id: 'v7', title: '商务词汇'}, {id: 's7', title: '常用句式'}, {id: 'k7', title: '外贸常识'}]
  },
  {
    id: 8,
    title: "售后 (After-sales)",
    status: StageStatus.LOCKED,
    subResources: [{id: 'v8', title: '商务词汇'}, {id: 's8', title: '常用句式'}, {id: 'k8', title: '外贸常识'}]
  }
];

export const SCENARIO_DB: Record<number, TaskDetail> = {
  1: {
    stageId: 1,
    mode: TaskMode.COMPLETED,
    title: "获客 (Client Acquisition)",
    taskId: "CA-2023-A01",
    attemptCount: 1,
    maxAttempts: 3,
    description: "在展会上首次接触潜在客户，交换名片并建立初步联系。",
    feedbackOrTipTitle: "🎉 表现亮点",
    feedbackOrTipContent: "恭喜！你在'寒暄'环节表现非常得体，成功使用了敬语 '久仰大名'。交换名片时的礼仪动作识别准确率为 100%。",
  },
  2: {
    stageId: 2,
    mode: TaskMode.IN_PROGRESS,
    title: "报价 (Quotation)",
    taskId: "QT-2023-X89",
    attemptCount: 2, 
    maxAttempts: 3,
    description: "向客户给出底价，并解释费用的构成。",
    subDescription: "需包含 FOB 术语说明及运费预估。",
    feedbackOrTipTitle: "💡 AI 商务教练复盘",
    feedbackOrTipContent: "上次失败原因：你只报了数字，没解释 FOB 术语的含义，客户认为运费由他承担，嫌贵。",
  },
  3: {
    stageId: 3,
    mode: TaskMode.PENDING,
    title: "磋商 (Negotiation)",
    taskId: "NG-2023-B12",
    attemptCount: 0,
    maxAttempts: 3,
    description: "针对价格分歧进行谈判，寻找双方都能接受的折中方案。",
    feedbackOrTipContent: "",
  }
};
