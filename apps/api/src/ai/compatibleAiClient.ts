import http from 'node:http';
import https from 'node:https';
import { HttpsProxyAgent } from 'https-proxy-agent';

const provider = process.env.AI_PROVIDER || 'deepseek';
const apiKey = process.env.AI_API_KEY || process.env.DEEPSEEK_API_KEY;
const baseURL =
  process.env.AI_BASE_URL ||
  (provider === 'deepseek' ? 'https://api.deepseek.com' : undefined);
const proxyUrl = process.env.AI_PROXY_URL || process.env.HTTPS_PROXY;
const httpAgent = proxyUrl ? new HttpsProxyAgent(proxyUrl) : undefined;

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
  '我理解你的说明，但这个方案还需要更清楚的业务依据。请你进一步说明条件、风险边界和下一步安排。';

const STAGE_PROMPTS: Record<string, string> = {
  acquisition: '当前是获客阶段。你扮演潜在客户，应关注供应商是否理解需求、是否专业、是否值得后续联系。',
  quotation: '当前是报价阶段。你扮演采购方，应关注价格构成、贸易术语、交付周期和让步空间。',
  negotiation: '当前是磋商阶段。你扮演强势采购方，应围绕价格、数量、付款和交期提出压力。',
  contract: '当前是合同阶段。你扮演客户法务/采购负责人，应追问条款边界、违约责任和口头承诺。',
  preparation: '当前是备货阶段。你扮演客户，应关注生产进度、质检安排和延期风险。',
  customs: '当前是报关阶段。你扮演客户，应关注单证是否齐全、清关时限和合规风险。',
  settlement: '当前是结算阶段。你扮演客户财务/采购方，应围绕付款节点、尾款、单据放行提出问题。',
  after_sales: '当前是售后阶段。你扮演遇到问题的客户，应关注事实确认、补救方案、赔偿和后续改进。'
};

export function getAiProviderName() {
  if (provider === 'deepseek') return 'deepseek';
  return 'compatible';
}

export type RoleplayReplyResult = {
  content: string;
  degraded: boolean;
};

export async function generateRoleplayReply(args: {
  stage: string;
  messages: Array<{ role: 'student' | 'coach'; content: string }>;
}): Promise<RoleplayReplyResult> {
  const aiEnabled = String(process.env.AI_ENABLED ?? 'true').toLowerCase();
  if (['false', '0', 'no', 'off', ''].includes(aiEnabled)) {
    return { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  }
  if (!apiKey) {
    return { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  }

  const model = process.env.AI_MODEL || 'deepseek-chat';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const systemPrompt = [
    '你是国际贸易场景里的客户/采购方角色扮演对象。',
    STAGE_PROMPTS[args.stage] ?? STAGE_PROMPTS.quotation,
    '必须用中文回复。请基于学生刚才的话，直接给出自然、简洁、带有商务压力的对手回复。',
    '不要写成教练建议，不要解释你在扮演角色。'
  ].join('\n');

  const history: RoleplayMessageParam[] = args.messages.map((message) => ({
    role: message.role === 'student' ? 'user' : 'assistant',
    content: message.content
  }));

  try {
    const completion = await createChatCompletion(
      {
        model,
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...history]
      },
      controller.signal
    );

    const content = completion.choices?.[0]?.message?.content?.trim();
    return content
      ? { content, degraded: false }
      : { content: MOCK_ROLEPLAY_REPLY, degraded: true };
  } catch (error) {
    const err = error as {
      name?: string;
      status?: number;
      code?: string;
      type?: string;
      message?: string;
    };
    console.warn('Compatible AI roleplay reply failed, using fallback:', {
      provider,
      baseURL,
      model,
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

function createChatCompletion(
  payload: {
    model: string;
    temperature: number;
    messages: RoleplayMessageParam[];
  },
  signal: AbortSignal
): Promise<ChatCompletionResponse> {
  if (!baseURL) {
    return Promise.reject(new Error('AI_BASE_URL is required'));
  }

  const endpoint = new URL('chat/completions', baseURL.endsWith('/') ? baseURL : `${baseURL}/`);
  const body = JSON.stringify(payload);
  const requester = endpoint.protocol === 'http:' ? http : https;

  return new Promise((resolve, reject) => {
    const request = requester.request(
      endpoint,
      {
        method: 'POST',
        agent: httpAgent,
        headers: {
          Authorization: `Bearer ${apiKey}`,
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
