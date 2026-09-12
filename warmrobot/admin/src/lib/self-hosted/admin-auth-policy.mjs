export function parseAdminEmails(raw) {
  if (!raw?.trim()) return new Set();

  return new Set(
    raw
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

export function isConfiguredAdminEmail(email, allowedEmails) {
  return Boolean(email && allowedEmails.has(email.trim().toLowerCase()));
}

export function safeAdminNextPath(value) {
  if (!value?.startsWith("/") || value.startsWith("//")) return "/admin";
  return value;
}
