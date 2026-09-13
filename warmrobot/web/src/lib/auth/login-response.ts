export function getEmailLoginError(status: number): string {
  if (status === 401) {
    return "登录未成功，请检查邮箱和密码后再试。";
  }
  if (status === 429) {
    return "尝试次数过多，请稍后再试。";
  }
  if (status >= 500) {
    return "登录服务暂时不可用，请稍后再试。";
  }
  return "登录未成功，请稍后再试。";
}
