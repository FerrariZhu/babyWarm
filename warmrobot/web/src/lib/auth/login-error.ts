const NETWORK_ERROR =
  /failed to fetch|fetch failed|networkerror|load failed|network request failed/i;

export function formatAuthLoginError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "登录失败，请重试";
  }

  const message = error.message.trim();
  if (NETWORK_ERROR.test(message)) {
    return "网络连接不太顺畅，请检查网络后重试。";
  }

  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "邮箱或密码错误";
  }
  if (lower.includes("email not confirmed")) {
    return "邮箱尚未验证";
  }

  return "登录暂时不可用，请稍后重试。";
}
