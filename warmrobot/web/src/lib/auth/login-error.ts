const NETWORK_ERROR =
  /failed to fetch|fetch failed|networkerror|load failed|network request failed/i;

export function formatAuthLoginError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "登录失败，请重试";
  }

  const message = error.message.trim();
  if (NETWORK_ERROR.test(message)) {
    return "无法连接登录服务。请确认本机已执行 supabase start。";
  }

  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "邮箱或密码错误";
  }
  if (lower.includes("email not confirmed")) {
    return "邮箱尚未验证";
  }

  return message || "登录失败，请重试";
}
