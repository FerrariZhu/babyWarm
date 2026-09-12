import { createHash, randomBytes } from "node:crypto";

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

export type MiniProgramSession = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  expires_in: number;
  token_type: "bearer";
};

export function generateSessionToken() {
  return randomBytes(32).toString("base64url");
}

export function digestSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function buildMiniProgramSession(
  accessToken: string,
  refreshToken: string,
  issuedAt = new Date()
): MiniProgramSession {
  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_at: Math.floor(issuedAt.getTime() / 1000) + ACCESS_TOKEN_TTL_SECONDS,
    expires_in: ACCESS_TOKEN_TTL_SECONDS,
    token_type: "bearer",
  };
}
