import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

type CoachMessageParam = OpenAI.Chat.Completions.ChatCompletionMessageParam;

const MOCK_REPLY =
  "收到。我先给你一个可执行建议：先共情对方预算压力，再用数据解释价格差异，并给出两档方案引导选择。你可以先问对方更关注成本还是交付。";

export async function generateCoachReply(args: {
  stage: string;
  messages: Array<{ role: "student" | "coach"; content: string }>;
}): Promise<string> {
  const aiEnabled = String(process.env.AI_ENABLED ?? "true").toLowerCase();
  if (["false", "0", "no", "off", ""].includes(aiEnabled)) return MOCK_REPLY;
  if (!process.env.OPENAI_API_KEY) return MOCK_REPLY;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS || 15000);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const systemPrompt =
    "你是一名商务谈判教练。必须用中文回答。请给学生直接可执行的一段回复建议，保持简洁。";

  const history: CoachMessageParam[] = args.messages.map((m) => ({
    role: m.role === "student" ? "user" : "assistant",
    content: m.content
  }));

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [{ role: "system", content: systemPrompt }, ...history]
    }, {
      signal: controller.signal
    });
    return completion.choices[0].message?.content?.trim() || MOCK_REPLY;
  } catch {
    return MOCK_REPLY;
  } finally {
    clearTimeout(timeoutId);
  }
}
