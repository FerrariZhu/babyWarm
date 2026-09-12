export function getWebAppUrl(): string {
  return process.env.NEXT_PUBLIC_WEB_APP_URL?.trim() || "http://localhost:3000";
}
