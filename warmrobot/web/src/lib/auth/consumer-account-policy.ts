// This formerly public shared identity must never expose consumer data.
// Keep this policy active before and after the deactivation migration runs.
export function isBlockedSharedDemoAccount(email: string | null | undefined): boolean {
  return email?.trim().toLowerCase() === "demo_user_1@warmrobot.dev";
}
