import { digestSessionToken } from "./session-token";

const OPAQUE_TOKEN = /^[A-Za-z0-9_-]{32,256}$/;

export class MiniProgramLogoutError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "MiniProgramLogoutError";
    this.status = status;
  }
}

export function parseMiniProgramLogoutBearer(authorization: string | null): string {
  const token = authorization?.match(/^Bearer[ \t]+([A-Za-z0-9_-]{32,256})$/i)?.[1];
  if (!token) throw new MiniProgramLogoutError("请提供有效的登录凭证", 401);
  return token;
}

export type MiniProgramLogoutQuery = (
  statement: string,
  values: unknown[]
) => Promise<{ revoked: boolean } | null>;

/**
 * Revoke exactly the supplied access/refresh pair when both belong to one consumer.
 * Expired or already-revoked pairs are accepted for idempotency. This is NOT session
 * family or all-device revocation: the current schema does not bind token families.
 */
export async function revokeMiniProgramSessionPair(
  accessToken: unknown,
  refreshToken: unknown,
  query: MiniProgramLogoutQuery
): Promise<boolean> {
  if (typeof accessToken !== "string" || !OPAQUE_TOKEN.test(accessToken)) {
    throw new MiniProgramLogoutError("请提供有效的登录凭证", 401);
  }
  if (typeof refreshToken !== "string" || !OPAQUE_TOKEN.test(refreshToken)) {
    throw new MiniProgramLogoutError("请提供有效的刷新令牌", 400);
  }

  const result = await query(
    `WITH matched AS MATERIALIZED (
       SELECT s.id AS session_id, rt.id AS refresh_id
         FROM public.app_sessions s
         JOIN public.app_refresh_tokens rt ON rt.account_id = s.principal_id
        WHERE s.principal_kind = 'consumer'
          AND s.token_digest = $1
          AND rt.token_digest = $2
        FOR UPDATE OF s, rt
     ), revoked_sessions AS (
       UPDATE public.app_sessions s
          SET revoked_at = COALESCE(s.revoked_at, now())
         FROM matched m
        WHERE s.id = m.session_id
       RETURNING s.id
     ), revoked_refresh_tokens AS (
       UPDATE public.app_refresh_tokens rt
          SET revoked_at = COALESCE(rt.revoked_at, now())
         FROM matched m
        WHERE rt.id = m.refresh_id
       RETURNING rt.id
     )
     SELECT EXISTS (SELECT 1 FROM revoked_sessions)
        AND EXISTS (SELECT 1 FROM revoked_refresh_tokens) AS revoked`,
    [digestSessionToken(accessToken), digestSessionToken(refreshToken)]
  );
  return result?.revoked === true;
}
