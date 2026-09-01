const DEFAULT_BEAUTIFY_BASE_URL = "https://api.siliconflow.cn/v1";
const DEFAULT_BEAUTIFY_MODEL = "Qwen/Qwen-Image-Edit-2509";
const DEFAULT_BEAUTIFY_TIMEOUT_MS = 120_000;
const DEFAULT_BEAUTIFY_STEPS = 20;
const DEFAULT_BEAUTIFY_GUIDANCE = 2.5;

const BEAUTIFY_PROMPT =
  "Background removal and edge cleanup ONLY for the baby clothing in the input photo. Remove background, hands, body, furniture, and all non-garment objects. Clean cutout edges: remove jagged pixels, halos, color fringing, and leftover background. Place the exact same garment on pure white (#FFFFFF). CRITICAL: preserve the input garment pixel-faithfully — same silhouette, sleeve length, neckline, hem length, pockets, buttons, prints, colors, fabric texture, wrinkles, and fold shape. Do NOT redesign, restyle, simplify, beautify, or reimagine the clothing. Do NOT change long sleeves to short sleeves or vice versa. Do NOT alter collar type, garment length, or decorative details. No creative reinterpretation. LOW-CONTRAST / SAME-COLOR PROTECTION: when garment fabric is white, cream, or light-colored and similar to the original background, do NOT erase or drop any part of the clothing. Keep the full garment intact, including white sleeves, white cuffs, white collars, and other low-contrast regions. Use subtle fabric folds, seams, shadows, prints, and neighboring color boundaries to separate garment from background. Never treat same-color clothing areas as background. Preserve complete sleeve volume and outer contour even where fabric color matches the background.";

const BEAUTIFY_NEGATIVE_PROMPT =
  "short sleeves, cropped sleeves, sleeveless, altered sleeve length, changed collar, redesigned garment, different clothing type, new pattern, recolored fabric, simplified design, fashion redesign, e-commerce template, flat-lay restyling, removed pockets, added pockets, missing prints, wrong garment shape, missing sleeves, cut-off sleeves, erased white fabric, holes in garment, incomplete cutout, eaten edges, removed low-contrast regions, white clothing merged into background, transparent gaps in sleeves";

export type BeautifyGarmentOptions = {
  mimeType?: string;
  preserveHint?: string | null;
};

export function isBeautifyConfigured(): boolean {
  const explicit = process.env.BEAUTIFY_ENABLED?.trim().toLowerCase();
  if (explicit === "false" || explicit === "0" || explicit === "off") return false;
  if (explicit === "true" || explicit === "1" || explicit === "on") {
    return Boolean(getBeautifyApiKey());
  }
  // auto：有硅基流动 Key 时默认开启入库美化
  return Boolean(getBeautifyApiKey());
}

function getBeautifyApiKey(): string | null {
  return (
    process.env.BEAUTIFY_API_KEY?.trim() ||
    process.env.VISION_API_KEY?.trim() ||
    process.env.OPENAI_API_KEY?.trim() ||
    null
  );
}

function getBeautifyBaseUrl(): string {
  return (
    process.env.BEAUTIFY_BASE_URL?.trim() ||
    process.env.VISION_BASE_URL?.trim() ||
    DEFAULT_BEAUTIFY_BASE_URL
  ).replace(/\/+$/, "");
}

function getBeautifyModel(): string {
  return (process.env.BEAUTIFY_MODEL ?? DEFAULT_BEAUTIFY_MODEL).trim() || DEFAULT_BEAUTIFY_MODEL;
}

export function getBeautifyProviderLabel(): string {
  return `siliconflow:${getBeautifyModel()}`;
}

function getBeautifyTimeoutMs(): number {
  const raw = Number(process.env.BEAUTIFY_TIMEOUT_MS ?? DEFAULT_BEAUTIFY_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BEAUTIFY_TIMEOUT_MS;
}

function getBeautifySteps(): number {
  const raw = Number(process.env.BEAUTIFY_STEPS ?? DEFAULT_BEAUTIFY_STEPS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BEAUTIFY_STEPS;
}

function getBeautifyGuidanceScale(): number {
  const raw = Number(process.env.BEAUTIFY_GUIDANCE_SCALE ?? DEFAULT_BEAUTIFY_GUIDANCE);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BEAUTIFY_GUIDANCE;
}

export function buildBeautifyPrompt(preserveHint?: string | null): string {
  const base = process.env.BEAUTIFY_PROMPT?.trim() || BEAUTIFY_PROMPT;
  const hint = preserveHint?.trim();
  if (!hint) return base;
  return `${base} The input garment is: ${hint}. Keep the exact sleeve length, neckline, and overall structure shown in the input.`;
}

function getBeautifyNegativePrompt(): string {
  return process.env.BEAUTIFY_NEGATIVE_PROMPT?.trim() || BEAUTIFY_NEGATIVE_PROMPT;
}

function toDataUrl(buffer: Buffer, mimeType: string): string {
  return `data:${mimeType};base64,${buffer.toString("base64")}`;
}

export class BeautifyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BeautifyError";
  }
}

export async function beautifyGarmentImage(
  imageBuffer: Buffer,
  options: BeautifyGarmentOptions = {}
): Promise<Buffer> {
  const mimeType = options.mimeType ?? "image/png";

  if (!isBeautifyConfigured()) {
    throw new BeautifyError("云美化未启用（BEAUTIFY_ENABLED=true + API Key）");
  }

  const apiKey = getBeautifyApiKey();
  if (!apiKey) {
    throw new BeautifyError("缺少 BEAUTIFY_API_KEY 或 VISION_API_KEY");
  }

  const controller = new AbortController();
  const timeoutMs = getBeautifyTimeoutMs();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const model = getBeautifyModel();
    const prompt = buildBeautifyPrompt(options.preserveHint);
    console.info(
      `[garment-beautify] calling ${model} (${Math.round(imageBuffer.length / 1024)}KB input${options.preserveHint ? `, hint=${options.preserveHint}` : ""})`
    );

    const response = await fetch(`${getBeautifyBaseUrl()}/images/generations`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        prompt,
        negative_prompt: getBeautifyNegativePrompt(),
        image: toDataUrl(imageBuffer, mimeType),
        num_inference_steps: getBeautifySteps(),
        guidance_scale: getBeautifyGuidanceScale(),
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new BeautifyError(
        `云美化请求失败 (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`
      );
    }

    const payload = (await response.json()) as {
      data?: { url?: string; b64_json?: string }[];
      images?: { url?: string; b64_json?: string }[];
    };

    const entry = payload.data?.[0] ?? payload.images?.[0];
    if (entry?.b64_json) {
      return Buffer.from(entry.b64_json, "base64");
    }

    const imageUrl = entry?.url;
    if (!imageUrl) {
      throw new BeautifyError("云美化响应缺少图片");
    }

    const imageResponse = await fetch(imageUrl, { signal: controller.signal });
    if (!imageResponse.ok) {
      throw new BeautifyError(`下载美化结果失败 (${imageResponse.status})`);
    }
    return Buffer.from(await imageResponse.arrayBuffer());
  } catch (error) {
    if (error instanceof BeautifyError) throw error;
    if (error instanceof Error && error.name === "AbortError") {
      throw new BeautifyError(`云美化超时（>${timeoutMs}ms）`);
    }
    throw new BeautifyError(error instanceof Error ? error.message : "云美化失败");
  } finally {
    clearTimeout(timeout);
  }
}
