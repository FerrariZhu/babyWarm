import type { SupabaseClient } from "@supabase/supabase-js";
import { ensurePlatformUser } from "./platform-identity";
import {
  isChinaMobilePhone,
  normalizePhone,
  normalizeWechatId,
  type WechatAuthInput,
  type WechatAuthUser,
} from "./wechat-types";

export function validateWechatAuthInput(raw: unknown): WechatAuthInput {
  if (!raw || typeof raw !== "object") {
    throw new Error("请求体无效");
  }

  const body = raw as Record<string, unknown>;
  const openid = typeof body.openid === "string" ? body.openid.trim() : "";
  const wechatIdValue =
    typeof body.wechat_id === "string" ? normalizeWechatId(body.wechat_id) : "";
  const wechat_id = wechatIdValue || undefined;
  const phone = typeof body.phone === "string" ? normalizePhone(body.phone) : "";
  const display_name =
    typeof body.display_name === "string" ? body.display_name.trim() : undefined;

  if (!openid) throw new Error("缺少 openid");
  if (!phone) throw new Error("缺少手机号");
  if (!isChinaMobilePhone(phone)) throw new Error("手机号格式不正确");

  return { openid, wechat_id, phone, display_name };
}

/** Resolve a verified WeChat identity to the phone's canonical account. */
export async function ensureWechatUser(
  admin: SupabaseClient,
  input: WechatAuthInput
): Promise<WechatAuthUser> {
  const migrated = await ensurePlatformUser(
    admin,
    { provider: "wechat", subject: input.openid, phone: input.phone },
    input.display_name ?? input.wechat_id ?? "微信用户"
  );

  const { error } = await admin
    .from("profiles")
    .update({
      wechat_openid: input.openid,
      ...(input.wechat_id ? { wechat_id: input.wechat_id } : {}),
    })
    .eq("id", migrated.userId);
  if (error) throw error;

  return migrated;
}
