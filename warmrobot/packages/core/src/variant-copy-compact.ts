/** Card-length trim for pros/cons — browser-safe, no generator imports. */

export const VARIANT_COPY_MAX_LEN = 20;

export function compactVariantCopy(text: string, maxLen = VARIANT_COPY_MAX_LEN): string {
  const trimmed = text.trim();
  if (!trimmed) return "";
  if (trimmed.length <= maxLen) return trimmed;
  const first = trimmed.split(/[，。；、]/)[0]?.trim() ?? trimmed;
  if (first.length <= maxLen) return first;
  return `${first.slice(0, maxLen - 1)}…`;
}
