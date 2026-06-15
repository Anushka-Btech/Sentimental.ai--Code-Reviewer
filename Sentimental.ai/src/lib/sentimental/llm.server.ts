
export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatOptions {
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResult {
  text: string;
  provider: "groq" | "lovable";
  model: string;
}

function providerConfig() {
  const groq = process.env.GROQ_API_KEY;
  if (groq) {
    return {
      provider: "groq" as const,
      baseUrl: "https://api.groq.com/openai/v1",
      apiKey: groq,
      model: process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
      authHeader: { Authorization: `Bearer ${groq}` },
    };
  }
}

export async function chat(messages: ChatMessage[], opts: ChatOptions = {}): Promise<ChatResult> {
  const cfg = providerConfig();
  const body: Record<string, unknown> = {
    model: cfg.model,
    messages,
    temperature: opts.temperature ?? 0.2,
  };
  if (opts.maxTokens) body.max_tokens = opts.maxTokens;
  if (opts.jsonMode) body.response_format = { type: "json_object" };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(cfg.authHeader as unknown as Record<string, string>),
  };
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    if (res.status === 429) throw new Error("Rate limit hit. Please retry shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted. Add credits to continue.");
    throw new Error(`LLM error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    choices: { message: { content: string } }[];
  };
  return {
    text: data.choices[0]?.message?.content ?? "",
    provider: cfg.provider,
    model: cfg.model,
  };
}

export function llmInfo() {
  try {
    const cfg = providerConfig();
    return { provider: cfg.provider, model: cfg.model };
  } catch {
    return { provider: "none" as const, model: "" };
  }
}
