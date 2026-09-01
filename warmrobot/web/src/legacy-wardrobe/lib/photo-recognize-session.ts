import type { WardrobeScanApiResponse } from "@/legacy-wardrobe/lib/wardrobe-scan-types";

export const WARDROBE_SCAN_SESSION_KEY = "warmrobot:wardrobe-scan-result";

export type WardrobeScanSessionPayload = {
  scanResult: WardrobeScanApiResponse;
  previewUrl: string;
  fromAdd?: boolean;
};

export function saveWardrobeScanSession(payload: WardrobeScanSessionPayload): void {
  try {
    sessionStorage.setItem(WARDROBE_SCAN_SESSION_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("[photo-recognize] sessionStorage save failed:", error);
    throw new Error("识别结果过大，请直接在扫描页上传照片。");
  }
}

export function consumeWardrobeScanSession(): WardrobeScanSessionPayload | null {
  const raw = sessionStorage.getItem(WARDROBE_SCAN_SESSION_KEY);
  if (!raw) return null;

  sessionStorage.removeItem(WARDROBE_SCAN_SESSION_KEY);

  try {
    const payload = JSON.parse(raw) as WardrobeScanSessionPayload;
    if (
      payload?.scanResult &&
      Array.isArray(payload.scanResult.items) &&
      typeof payload.previewUrl === "string"
    ) {
      return payload;
    }
  } catch {
    return null;
  }

  return null;
}
