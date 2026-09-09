import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isChinaMobilePhone, normalizePhone } from "./wechat-types";

export const LOGIN_PROVIDERS = ["wechat", "xiaohongshu", "douyin"] as const;
export type LoginProvider = (typeof LOGIN_PROVIDERS)[number];

export type PlatformIdentityInput = {
  provider: LoginProvider;
  subject: string;
  phone: string;
};

export type EnsuredPlatformUser = {
  userId: string;
  email: string;
};

const EMAIL_DOMAIN = "auth.warmrobot.dev";

export function validatePlatformIdentity(raw: unknown): PlatformIdentityInput {
  if (!raw || typeof raw !== "object") throw new Error("请求体无效");
  const body = raw as Record<string, unknown>;
  const provider = typeof body.provider === "string" ? body.provider.trim() : "";
  const subject = typeof body.subject === "string" ? body.subject.trim() : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";

  if (!LOGIN_PROVIDERS.includes(provider as LoginProvider)) throw new Error("不支持的登录平台");
  if (!subject) throw new Error("缺少平台用户标识");
  if (!isChinaMobilePhone(phone)) throw new Error("手机号格式不正确");

  return { provider: provider as LoginProvider, subject, phone };
}

export function platformAuthEmail(provider: LoginProvider, subject: string): string {
  const safe = subject.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  return `${provider}+${safe}@${EMAIL_DOMAIN}`;
}

function accountAuthPassword(userId: string): string {
  const secret = process.env.WECHAT_AUTH_SECRET?.trim();
  if (!secret) throw new Error("缺少 WECHAT_AUTH_SECRET。请在 web/.env.local 配置。");
  return createHmac("sha256", secret).update(`account:${userId}`).digest("hex").slice(0, 32);
}

async function getAuthEmail(admin: SupabaseClient, userId: string): Promise<string> {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  if (!data.user.email) throw new Error("账号缺少登录标识");
  return data.user.email;
}

/**
 * Resolves every verified third-party identity to one canonical Supabase user.
 * The caller must obtain `subject` and `phone` from the provider's server-side
 * verification response, never from editable client fields.
 */
export async function ensurePlatformUser(
  admin: SupabaseClient,
  raw: PlatformIdentityInput,
  displayName?: string
): Promise<EnsuredPlatformUser> {
  const input = validatePlatformIdentity(raw);
  const { data: identity, error: identityError } = await admin
    .from("login_identities")
    .select("user_id, profiles!inner(phone)")
    .eq("provider", input.provider)
    .eq("provider_subject", input.subject)
    .maybeSingle();
  if (identityError) throw identityError;

  if (identity) {
    const identityPhone = (identity.profiles as unknown as { phone: string | null }).phone;
    if (identityPhone !== input.phone) throw new Error("该平台账号的手机号与已绑定账号不一致");
    const email = await getAuthEmail(admin, identity.user_id);
    await admin.auth.admin.updateUserById(identity.user_id, { password: accountAuthPassword(identity.user_id) });
    return { userId: identity.user_id, email };
  }

  const { data: phoneProfile, error: phoneError } = await admin
    .from("profiles")
    .select("id")
    .eq("phone", input.phone)
    .maybeSingle();
  if (phoneError) throw phoneError;

  if (phoneProfile) {
    const { error: insertError } = await admin.from("login_identities").insert({
      user_id: phoneProfile.id,
      provider: input.provider,
      provider_subject: input.subject,
      phone_verified_at: new Date().toISOString(),
    });
    if (insertError) throw insertError;
    const email = await getAuthEmail(admin, phoneProfile.id);
    await admin.auth.admin.updateUserById(phoneProfile.id, { password: accountAuthPassword(phoneProfile.id) });
    return { userId: phoneProfile.id, email };
  }

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: platformAuthEmail(input.provider, input.subject),
    password: accountAuthPassword(input.subject),
    email_confirm: true,
    user_metadata: {
      display_name: displayName ?? `${input.provider}用户`,
      phone: input.phone,
    },
  });
  if (createError) throw createError;

  const userId = created.user.id;
  const { error: profileError } = await admin.from("profiles").update({
    phone: input.phone,
    ...(displayName ? { display_name: displayName } : {}),
  }).eq("id", userId);
  if (profileError) throw profileError;
  const { error: insertError } = await admin.from("login_identities").insert({
    user_id: userId,
    provider: input.provider,
    provider_subject: input.subject,
    phone_verified_at: new Date().toISOString(),
  });
  if (insertError) throw insertError;
  await admin.auth.admin.updateUserById(userId, { password: accountAuthPassword(userId) });
  return { userId, email: await getAuthEmail(admin, userId) };
}

export function platformAuthPassword(userId: string): string {
  return accountAuthPassword(userId);
}
