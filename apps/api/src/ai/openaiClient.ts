import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type RoleplayMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MOCK_ROLEPLAY_REPLY =
  '我理解你的说明，但目前这个报价对我们还是偏高。除非你能进一步解释价格构成，或者在数量、付款条件上给出更有竞争力的方案，否则我们很难继续推进。';

export async function generateRoleplayReply(args: {
  stage: string;
  messages: Array<{ role: 'student' | 'coach'; content: string }>;
}): Promise<string> {
  const aiEnabled = String(process.env.AI_ENABLED ?? 'true').toLowerCase();
  if (['false', '0', 'no', 'off', ''].includes(aiEnabled)) {
    return MOCK_ROLEPLAY_REPLY;
  }
  if (!process.env.OPENAI_API_KEY) {
    return MOCK_ROLEPLAY_REPLY;
  }

  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const systemPrompt =
    '你是国际贸易场景里的客户/采购方角色扮演对象。必须用中文回复。请基于学生刚才的话，直接给出自然、简洁、带有商务压力的对手回复，不要写成教练建议，不要解释你在扮演角色。';

  const history: RoleplayMessageParam[] = args.messages.map((message) => ({
    role: message.role === 'student' ? 'user' : 'assistant',
    content: message.content
  }));

  try {
    const completion = await client.chat.completions.create(
      {
        model,
        temperature: 0.7,
        messages: [{ role: 'system', content: systemPrompt }, ...history]
      },
      {
        signal: controller.signal
      }
    );

    return completion.choices[0].message?.content?.trim() || MOCK_ROLEPLAY_REPLY;
  } catch {
    return MOCK_ROLEPLAY_REPLY;
  } finally {
    clearTimeout(timeoutId);
  }
}
