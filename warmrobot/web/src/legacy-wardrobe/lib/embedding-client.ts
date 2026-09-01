export type EmbeddingProvider = "openai_compat";

export type EmbeddingConfig = {
  provider: EmbeddingProvider;
  baseUrl: string;
  apiKey: string;
  model: string;
  dimensions: number;
  timeoutMs: number;
};

const DEFAULT_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_MODEL = "BAAI/bge-large-zh-v1.5";

function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

function resolveApiKey(): string | null {
  return (
    process.env.EMBEDDING_API_KEY?.trim() ||
    process.env.VISION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

export function getEmbeddingConfig(): EmbeddingConfig | null {
  const explicitProvider = process.env.EMBEDDING_PROVIDER?.trim().toLowerCase();

  if (explicitProvider === "ollama") {
    return null;
  }

  const apiKey = resolveApiKey();
  if (!apiKey) return null;

  if (
    !explicitProvider ||
    explicitProvider === "auto" ||
    explicitProvider === "openai_compat" ||
    explicitProvider === "siliconflow"
  ) {
    return {
      provider: "openai_compat",
      baseUrl: trimTrailingSlash(
        process.env.EMBEDDING_BASE_URL?.trim() ||
          process.env.VISION_BASE_URL?.trim() ||
          DEFAULT_BASE_URL
      ),
      apiKey,
      model: process.env.EMBEDDING_MODEL?.trim() || DEFAULT_MODEL,
      dimensions: Number(process.env.EMBEDDING_DIMENSIONS ?? 1024),
      timeoutMs: Number(process.env.EMBEDDING_TIMEOUT_MS ?? 30_000),
    };
  }

  return null;
}

export function isEmbeddingConfigured(): boolean {
  const config = getEmbeddingConfig();
  if (!config) return false;
  const dbDims = Number(process.env.EMBEDDING_DB_DIMENSIONS ?? 1536);
  return config.dimensions === dbDims;
}

async function callOpenAiCompatEmbedding(
  config: EmbeddingConfig,
  text: string
): Promise<number[]> {
  const response = await fetch(`${config.baseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      input: text.slice(0, 8000),
    }),
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Embedding 请求失败（${response.status}）${errText.slice(0, 120)}`);
  }

  const payload = (await response.json()) as {
    data?: { embedding?: number[] }[];
  };
  const embedding = payload.data?.[0]?.embedding;
  if (!embedding?.length) throw new Error("Embedding 响应无效");
  return embedding;
}

export async function createTextEmbedding(text: string): Promise<number[]> {
  const config = getEmbeddingConfig();
  if (!config) {
    throw new Error(
      "未配置 Embedding。设置 EMBEDDING_API_KEY 或复用 VISION_API_KEY（硅基流动）"
    );
  }
  return callOpenAiCompatEmbedding(config, text);
}
