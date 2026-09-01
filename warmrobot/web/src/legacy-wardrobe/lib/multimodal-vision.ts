export type VisionProvider = "openai_compat";

export type VisionConfig = {
  provider: VisionProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
};

export type VisionJsonRequest = {
  systemPrompt: string;
  userText: string;
  imageBase64: string;
  mimeType: string;
};

const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "Qwen/Qwen3-VL-8B-Instruct";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveApiKey(): string | null {
  return (
    process.env.VISION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

/**
 * Vision backend: SiliconFlow (openai_compat) or OpenAI-compatible cloud API.
 * Requires VISION_API_KEY (or OPENAI_API_KEY for legacy setups).
 */
export function getVisionConfig(): VisionConfig | null {
  const explicitProvider = process.env.VISION_PROVIDER?.trim().toLowerCase();
  const apiKey = resolveApiKey();

  if (explicitProvider === "ollama") {
    return null;
  }

  if (explicitProvider === "openai_compat" || explicitProvider === "siliconflow" || explicitProvider === "auto" || !explicitProvider) {
    if (!apiKey) return null;
    return {
      provider: "openai_compat",
      baseUrl: trimTrailingSlash(
        process.env.VISION_BASE_URL?.trim() || DEFAULT_BASE_URL
      ),
      apiKey,
      model: process.env.VISION_MODEL?.trim() || DEFAULT_MODEL,
      timeoutMs: Number(process.env.VISION_TIMEOUT_MS ?? 120_000),
    };
  }

  if (apiKey) {
    const isOpenAi =
      explicitProvider === "openai" ||
      Boolean(process.env.OPENAI_API_KEY?.trim() && !process.env.VISION_API_KEY?.trim());
    return {
      provider: "openai_compat",
      baseUrl: trimTrailingSlash(
        isOpenAi
          ? process.env.OPENAI_BASE_URL?.trim() || "https://api.openai.com/v1"
          : process.env.VISION_BASE_URL?.trim() || DEFAULT_BASE_URL
      ),
      apiKey,
      model:
        process.env.OPENAI_VISION_MODEL?.trim() ||
        process.env.VISION_MODEL?.trim() ||
        (isOpenAi ? "gpt-4o-mini" : DEFAULT_MODEL),
      timeoutMs: Number(process.env.VISION_TIMEOUT_MS ?? 120_000),
    };
  }

  return null;
}

export function isVisionConfigured(): boolean {
  return getVisionConfig() != null;
}

export function visionSetupHint(): string {
  return [
    "视觉识别未配置。请在 web/.env.local 设置：",
    "VISION_PROVIDER=openai_compat",
    "VISION_API_KEY=sk-...（硅基流动 https://siliconflow.cn）",
    "VISION_MODEL=Qwen/Qwen3-VL-8B-Instruct",
  ].join(" ");
}

export async function checkVisionHealth(): Promise<boolean> {
  return Boolean(getVisionConfig()?.apiKey);
}

function parseJsonContent(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return fenced?.[1]?.trim() ?? trimmed;
}

async function callOpenAiCompatVision(
  config: VisionConfig,
  request: VisionJsonRequest
): Promise<string> {
  const dataUrl = `data:${request.mimeType};base64,${request.imageBase64}`;
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.1,
      max_tokens: 8192,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: request.systemPrompt },
        {
          role: "user",
          content: [
            { type: "text", text: request.userText },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`视觉识别失败（${response.status}）${errText.slice(0, 200)}`);
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content?.trim()) throw new Error("视觉模型未返回内容");
  return parseJsonContent(content);
}

export async function callVisionJson(request: VisionJsonRequest): Promise<string> {
  const config = getVisionConfig();
  if (!config) throw new Error(visionSetupHint());
  return callOpenAiCompatVision(config, request);
}

export function getActiveVisionProviderLabel(): string {
  const config = getVisionConfig();
  if (!config) return "未配置";
  if (config.baseUrl.includes("siliconflow")) return `硅基流动 / ${config.model}`;
  return `${config.baseUrl} / ${config.model}`;
}
