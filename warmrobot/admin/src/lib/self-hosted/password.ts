import { scryptSync, timingSafeEqual } from "node:crypto";

/** Verifies the scrypt format used by the self-hosted consumer account table. */
export function verifyPassword(password: string, storedHash: string): boolean {
  const fields = storedHash.includes("$") ? storedHash.split("$") : storedHash.split(":");
  const [algorithm, salt, expected] =
    fields.length === 3 ? fields : ["scrypt", fields[0], fields[1]];
  if (algorithm !== "scrypt" || !salt || !expected) return false;

  const actual = scryptSync(password, salt, 64).toString("base64url");
  const expectedBytes = Buffer.from(expected);
  const actualBytes = Buffer.from(actual);
  return expectedBytes.length === actualBytes.length && timingSafeEqual(expectedBytes, actualBytes);
}
