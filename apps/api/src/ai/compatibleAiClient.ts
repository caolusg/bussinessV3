import http from 'node:http';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { getDefaultRuntimeConfig, readRuntimeState } from '../services/runtimeConfigService.js';

type RoleplayMessageParam = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const MOCK_ROLEPLAY_REPLY =
  '我理解你的说明，不过这个方案还需要更清楚的业务依据。请你进一步说明条件、风险边界和下一步安排。';

const MOCK_COACHING_REPLY =
  '可以先把客户刚才的问题拆成三层：他在确认事实、评估风险、要求你给出下一步承诺。你回复时先复述关键信息，再说明业务依据，最后给出一个可执行安排。';

const STAGE_PROMPTS: Record<string, string> = {
  acquisition: '当前是获客阶段。你扮演潜在客户，应该关注供应商是否理解需求、是否专业、是否值得后续联系。',
  quotation: '当前是报价阶段。你扮演采购方，应该关注价格构成、贸易术语、交付周期和让步空间。',
  negotiation: '当前是磋商阶段。你扮演强势采购方，应该围绕价格、数量、付款和交期提出压力。',
  contract: '当前是合同阶段。你扮演客户法务/采购负责人，应该追问条款边界、违约责任和口头承诺。',
  preparation: '当前是备货阶段。你扮演客户，应该关注生产进度、质检安排和延期风险。',
  customs: '当前是报关阶段。你扮演客户，应该关注单证是否齐全、清关时限和合规风险。',
  settlement: '当前是结算阶段。你扮演客户财务/采购方，应该围绕付款节点、尾款和单据放行提出问题。',
  after_sales: '当前是售后阶段。你扮演遇到问题的客户，应该关注事实确认、补救方案、赔偿和后续改进。'
};

export function getAiProviderName(): 'deepseek' | 'compatible' | 'openclaw' {
  const provider = (process.env.AI_PROVIDER || 'compatible').toLowerCase();
  if (provider === 'deepseek' || provider === 'openclaw' || provider === 'compatible') {
    return provider;
  }
  return 'compatible';
}

export type RoleplayReplyResult = {
  content: string;
  degraded: boolean;
};

export type CoachingReplyResult = {
  content: string;
  degraded: boolean;
};

type ResolvedAiConfig = {
  provider: string;
  apiKey: string;
  baseURL: string;
  proxyUrl: string;
  enabled: boolean;
  model: string;
  timeoutMs: number;
};

async function resolveAiConfig(): Promise<ResolvedAiConfig> {
  const fallback = getDefaultRuntimeConfig();
  try {
    const runtimeState = await readRuntimeState();
    const config = runtimeState.config;
    return {
      provider: config.provider || fallback.provider,
      apiKey: config.apiKey || fallback.apiKey,
      baseURL: config.baseUrl || fallback.baseUrl,
      proxyUrl: config.proxyUrl || fallback.proxyUrl,
      enabled: config.enabled ?? fallback.enabled,
      model: config.model || fallback.model,
      timeoutMs: Number.isFinite(Number(config.timeoutMs)) ? Number(config.timeoutMs) : fallback.timeoutMs
    };
  } catch {
    return {
      provider: fallback.provider,
      apiKey: fallback.apiKey,
      baseURL: fallback.baseUrl,
      proxyUrl: fallback.proxyUrl,
      enabled: fallback.enabled,
      model: fallback.model,
      timeoutMs: fallback.timeoutMs
    };
  }
}

export async function generateRoleplayReply(args: {
  stage: string;
  messages: Array<{ role: 'student' | 'coach'; content: string }>;
  systemPrompt?: string | null;
}): Promise<RoleplayReplyResult> {
  const runtimeConfig = await resolveAiConfig();
  if (!runtimeConfig.enabled || !runtimeConfig.apiKey) {
    return { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), runtimeConfig.timeoutMs);

  const systemPrompt = args.systemPrompt?.trim() || [
    '你是国际贸易场景中的客户/采购方角色扮演对象。',
    STAGE_PROMPTS[args.stage] ?? STAGE_PROMPTS.quotation,
    '必须用中文回复。请基于学生刚才的话，直接给出自然、简洁、带有商务压力的对话回复。',
    '不要写成教练建议，不要解释你在扮演角色。'
  ].join('\n');

  const history: RoleplayMessageParam[] = args.messages.map((message) => ({
    role: message.role === 'student' ? 'user' : 'assistant',
    content: message.content
  }));

  try {
    const completion = await createChatCompletion(
      {
        model: runtimeConfig.model,
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...history]
      },
      controller.signal,
      runtimeConfig
    );

    const content = completion.choices?.[0]?.message?.content?.trim();
    return content ? { content, degraded: false } : { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  } catch (error) {
    const err = error as {
      name?: string;
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };
    console.warn('Compatible AI roleplay reply failed, using fallback:', {
      provider: runtimeConfig.provider,
      baseURL: runtimeConfig.baseURL,
      model: runtimeConfig.model,
      name: err.name,
      status: err.status,
      code: err.code,
      type: err.type,
      message: err.message
    });
    return { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateCoachingReply(args: {
  stage: string;
  question: string;
  messages: Array<{ role: 'student' | 'opponent' | 'coach'; content: string }>;
}): Promise<CoachingReplyResult> {
  const runtimeConfig = await resolveAiConfig();
  if (!runtimeConfig.enabled || !runtimeConfig.apiKey) {
    return { content: MOCK_COACHING_REPLY, degraded: true };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), runtimeConfig.timeoutMs);

  const systemPrompt = [
    '你是商务中文实训平台里的 AI 教练。',
    STAGE_PROMPTS[args.stage] ?? STAGE_PROMPTS.quotation,
    '你必须基于当前会话上下文回答学生的问题。',
    '回答要短、具体、可执行。优先解释客户刚才话里的业务含义、潜在风险、学生下一句可以怎么说。',
    '如果学生没有明确提问，就主动给出：客户意图、关键信息、下一步建议、可直接使用的中文表达。'
  ].join('\n');

  const context = args.messages
    .slice(-16)
    .map((message) => `${message.role}: ${message.content}`)
    .join('\n');

  try {
    const completion = await createChatCompletion(
      {
        model: runtimeConfig.model,
        temperature: 0.35,
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              '当前会话：',
              context || '暂无会话消息',
              '',
              '学生问题：',
              args.question || '请根据当前上下文给我即时指导。'
            ].join('\n')
          }
        ]
      },
      controller.signal,
      runtimeConfig
    );

    const content = completion.choices?.[0]?.message?.content?.trim();
    return content ? { content, degraded: false } : { content: MOCK_COACHING_REPLY, degraded: true };
  } catch (error) {
    const err = error as {
      name?: string;
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };
    console.warn('Compatible AI coaching reply failed, using fallback:', {
      provider: runtimeConfig.provider,
      baseURL: runtimeConfig.baseURL,
      model: runtimeConfig.model,
      name: err.name,
      status: err.status,
      code: err.code,
      type: err.type,
      message: err.message
    });
    return { content: MOCK_COACHING_REPLY, degraded: true };
  } finally {
    clearTimeout(timeoutId);
  }
}

function createChatCompletion(
  payload: {
    model: string;
    temperature: number;
    messages: RoleplayMessageParam[];
  },
  signal: AbortSignal,
  config: ResolvedAiConfig
): Promise<ChatCompletionResponse> {
  if (!config.baseURL) {
    return Promise.reject(new Error('AI_BASE_URL is required'));
  }

  const endpoint = new URL('chat/completions', config.baseURL.endsWith('/') ? config.baseURL : `${config.baseURL}/`);
  const body = JSON.stringify(payload);
  const requester = endpoint.protocol === 'http:' ? http : https;
  const httpAgent = config.proxyUrl ? new HttpsProxyAgent(config.proxyUrl) : undefined;

  return new Promise((resolve, reject) => {
    const request = requester.request(
      endpoint,
      {
        method: 'POST',
        agent: httpAgent,
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      },
      (response) => {
        let responseBody = '';

        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          responseBody += chunk;
        });
        response.on('end', () => {
          if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
            reject(
              Object.assign(new Error(`AI request failed with status ${response.statusCode}`), {
                status: response.statusCode,
                message: responseBody
              })
            );
            return;
          }

          try {
            resolve(JSON.parse(responseBody) as ChatCompletionResponse);
          } catch (error) {
            reject(error);
          }
        });
      }
    );

    const abort = () => {
      request.destroy(Object.assign(new Error('AI request aborted'), { name: 'AbortError' }));
    };

    signal.addEventListener('abort', abort, { once: true });
    request.on('error', reject);
    request.on('close', () => signal.removeEventListener('abort', abort));
    request.write(body);
    request.end();
  });
}
