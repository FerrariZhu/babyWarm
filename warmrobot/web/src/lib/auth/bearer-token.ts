/** Returns a user JWT only when the request uses the Bearer scheme. */
export function getBearerToken(authorization: string | null): string | null {
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token || null;
}
