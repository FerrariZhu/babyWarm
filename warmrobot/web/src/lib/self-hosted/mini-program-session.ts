import { queryOne, withTransaction } from "@/lib/self-hosted/database";
import {
  ACCESS_TOKEN_TTL_SECONDS,
  REFRESH_TOKEN_TTL_SECONDS,
  buildMiniProgramSession,
  digestSessionToken,
  generateSessionToken,
  type MiniProgramSession,
} from "@/lib/self-hosted/session-token";

export async function createMiniProgramSession(accountId: string): Promise<MiniProgramSession> {
  const issuedAt = new Date();
  const accessToken = generateSessionToken();
  const refreshToken = generateSessionToken();
  const accessExpiresAt = new Date(issuedAt.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1_000);
  const refreshExpiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000);

  await withTransaction(async (client) => {
    await client.query(
      `INSERT INTO public.app_sessions
        (principal_kind, principal_id, token_digest, expires_at)
       VALUES ('consumer', $1, $2, $3)`,
      [accountId, digestSessionToken(accessToken), accessExpiresAt]
    );
    await client.query(
      `INSERT INTO public.app_refresh_tokens (account_id, token_digest, expires_at)
       VALUES ($1, $2, $3)`,
      [accountId, digestSessionToken(refreshToken), refreshExpiresAt]
    );
  });

  return buildMiniProgramSession(accessToken, refreshToken, issuedAt);
}

/** Consume the old refresh token and atomically replace it with a new pair. */
export async function rotateMiniProgramSession(
  refreshToken: string
): Promise<MiniProgramSession | null> {
  const issuedAt = new Date();
  const accessToken = generateSessionToken();
  const replacementRefreshToken = generateSessionToken();
  const accessExpiresAt = new Date(issuedAt.getTime() + ACCESS_TOKEN_TTL_SECONDS * 1_000);
  const refreshExpiresAt = new Date(issuedAt.getTime() + REFRESH_TOKEN_TTL_SECONDS * 1_000);

  const rotated = await queryOne<{ account_id: string }>(
    `WITH consumed AS (
       UPDATE public.app_refresh_tokens rt
          SET revoked_at = now(), last_used_at = now()
        WHERE rt.token_digest = $1
          AND rt.revoked_at IS NULL
          AND rt.expires_at > now()
          AND EXISTS (
            SELECT 1 FROM public.app_accounts a
             WHERE a.id = rt.account_id AND a.is_active = true
          )
       RETURNING rt.id, rt.account_id
     ), replacement AS (
       INSERT INTO public.app_refresh_tokens (account_id, token_digest, expires_at)
       SELECT account_id, $2, $3 FROM consumed
       RETURNING id, account_id
     ), access_session AS (
       INSERT INTO public.app_sessions
         (principal_kind, principal_id, token_digest, expires_at)
       SELECT 'consumer', account_id, $4, $5 FROM replacement
       RETURNING principal_id
     )
     SELECT principal_id AS account_id FROM access_session`,
    [
      digestSessionToken(refreshToken),
      digestSessionToken(replacementRefreshToken),
      refreshExpiresAt,
      digestSessionToken(accessToken),
      accessExpiresAt,
    ]
  );

  if (!rotated) return null;
  return buildMiniProgramSession(accessToken, replacementRefreshToken, issuedAt);
}
