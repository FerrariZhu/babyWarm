export function homeHref(options?: { refresh?: boolean; at?: string | null }): string {
  const params = new URLSearchParams();
  if (options?.refresh) params.set("refresh", "1");
  if (options?.at) params.set("at", options.at);
  const query = params.toString();
  return query ? `/?${query}` : "/";
}
