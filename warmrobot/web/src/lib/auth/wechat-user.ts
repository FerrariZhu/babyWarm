import { createHmac } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  isChinaMobilePhone,
  normalizePhone,
  normalizeWechatId,
  type WechatAuthInput,
  type WechatAuthUser,
} from "./wechat-types";

const EMAIL_DOMAIN = "auth.warmrobot.dev";

export function getWechatAuthSecret(): string {
  const secret = process.env.WECHAT_AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("缺少 WECHAT_AUTH_SECRET。请在 web/.env.local 配置。");
  }
  return secret;
}

export function isWechatMockAuthAllowed(): boolean {
  if (process.env.ALLOW_WECHAT_MOCK_AUTH === "true") return true;
  return process.env.NODE_ENV === "development";
}

export function wechatAuthEmail(openid: string): string {
  const safe = openid.trim().toLowerCase().replace(/[^a-z0-9._-]+/g, "_");
  return `wechat+${safe}@${EMAIL_DOMAIN}`;
}

export function wechatAuthPassword(openid: string): string {
  return createHmac("sha256", getWechatAuthSecret())
    .update(`wechat:${openid}`)
    .digest("hex")
    .slice(0, 32);
}

function isAlreadyRegistered(error: { message?: string; status?: number }): boolean {
  const message = error.message?.toLowerCase() ?? "";
  return (
    error.status === 422 ||
    message.includes("already been registered") ||
    message.includes("already registered") ||
    message.includes("duplicate")
  );
}

async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1;
  const perPage = 200;

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase());
    if (match) return match.id;
    if (data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

async function syncProfile(
  admin: SupabaseClient,
  userId: string,
  input: WechatAuthInput
): Promise<void> {
  const { error } = await admin
    .from("profiles")
    .update({
      wechat_openid: input.openid,
      wechat_id: input.wechat_id,
      phone: input.phone,
      ...(input.display_name ? { display_name: input.display_name } : {}),
    })
    .eq("id", userId);

  if (error) throw error;
}

export function validateWechatAuthInput(raw: unknown): WechatAuthInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("请求体无效");
  }

  const body = raw as Record<string, unknown>;
  const openid = typeof body.openid === "string" ? body.openid.trim() : "";
  const wechat_id = typeof body.wechat_id === "string" ? normalizeWechatId(body.wechat_id) : "";
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const display_name =
    typeof body.display_name === "string" ? body.display_name.trim() : undefined;

  if (!openid) throw new Error("缺少 openid");
  if (!wechat_id) throw new Error("缺少微信号");
  if (!phone) throw new Error("缺少手机号");
  if (!isChinaMobilePhone(phone)) throw new Error("手机号格式不正确");

  return { openid, wechat_id, phone, display_name };
}

/** Find or create Supabase auth user keyed by WeChat openid; sync phone + 微信号 on profile. */
export async function ensureWechatUser(
  admin: SupabaseClient,
  input: WechatAuthInput
): Promise<WechatAuthUser> {
  const email = wechatAuthEmail(input.openid);

  const { data: openidProfile, error: openidError } = await admin
    .from("profiles")
    .select("id")
    .eq("wechat_openid", input.openid)
    .maybeSingle();
  if (openidError) throw openidError;

  if (openidProfile) {
    const { data: phoneConflict, error: phoneError } = await admin
      .from("profiles")
      .select("id")
      .eq("phone", input.phone)
      .neq("id", openidProfile.id)
      .maybeSingle();
    if (phoneError) throw phoneError;
    if (phoneConflict) throw new Error("该手机号已绑定其他微信账号");

    await syncProfile(admin, openidProfile.id, input);
    return { userId: openidProfile.id, email };
  }

  const { data: phoneProfile, error: phoneLookupError } = await admin
    .from("profiles")
    .select("id, wechat_openid")
    .eq("phone", input.phone)
    .maybeSingle();
  if (phoneLookupError) throw phoneLookupError;
  if (phoneProfile) {
    throw new Error("该手机号已绑定其他微信账号");
  }

  const password = wechatAuthPassword(input.openid);
  const metadata = {
    auth_provider: "wechat",
    signup_channel: "miniprogram",
    wechat_openid: input.openid,
    wechat_id: input.wechat_id,
    phone: input.phone,
    display_name: input.display_name ?? input.wechat_id,
  };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });

  if (createError) {
    if (!isAlreadyRegistered(createError)) throw createError;

    const userId = await findAuthUserIdByEmail(admin, email);
    if (!userId) throw createError;

    await admin.auth.admin.updateUserById(userId, {
      password,
      user_metadata: metadata,
    });
    await syncProfile(admin, userId, input);
    return { userId, email };
  }

  await syncProfile(admin, created.user.id, input);
  return { userId: created.user.id, email };
}
