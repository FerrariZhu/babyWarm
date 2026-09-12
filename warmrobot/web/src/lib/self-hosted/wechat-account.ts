import { randomUUID } from "node:crypto";
import { withTransaction } from "@/lib/self-hosted/database";
import type { VerifiedWechatIdentity } from "@/lib/auth/wechat-provider";

export type SelfHostedWechatUser = {
  userId: string;
  phone: string;
};

/**
 * Resolve a server-verified WeChat identity to one canonical local account.
 * Advisory locks serialize first-login races for both the OpenID and phone.
 */
export async function ensureSelfHostedWechatUser(
  identity: VerifiedWechatIdentity
): Promise<SelfHostedWechatUser> {
  return withTransaction(async (client) => {
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended($1, 0)), pg_advisory_xact_lock(hashtextextended($2, 0))",
      [`wechat:${identity.openid}`, `phone:${identity.phone}`]
    );

    const existingIdentity = await client.query<{
      user_id: string;
      account_phone: string | null;
      profile_phone: string | null;
    }>(
      `SELECT li.user_id, a.phone AS account_phone, p.phone AS profile_phone
         FROM public.login_identities li
         JOIN public.app_accounts a ON a.id = li.user_id
         JOIN public.profiles p ON p.id = li.user_id
        WHERE li.provider = 'wechat' AND li.provider_subject = $1
        FOR UPDATE OF li, a, p`,
      [identity.openid]
    );

    const existing = existingIdentity.rows[0];
    if (existing) {
      const boundPhone = existing.account_phone ?? existing.profile_phone;
      if (boundPhone && boundPhone !== identity.phone) {
        throw new Error("该微信账号绑定的手机号与现有账号不一致");
      }
      await updateWechatAccount(client, existing.user_id, identity);
      return { userId: existing.user_id, phone: identity.phone };
    }

    const phoneAccount = await client.query<{ id: string }>(
      `SELECT a.id
         FROM public.app_accounts a
         LEFT JOIN public.profiles p ON p.id = a.id
        WHERE a.phone = $1 OR p.phone = $1
        ORDER BY a.created_at
        LIMIT 1
        FOR UPDATE OF a`,
      [identity.phone]
    );

    const userId = phoneAccount.rows[0]?.id ?? randomUUID();
    if (!phoneAccount.rows[0]) {
      await client.query(
        `INSERT INTO public.app_accounts (id, phone, display_name)
         VALUES ($1, $2, '微信用户')`,
        [userId, identity.phone]
      );
      await client.query(
        `INSERT INTO public.profiles
          (id, display_name, phone, wechat_openid, wechat_unionid, last_login_channel, last_login_at)
         VALUES ($1, '微信用户', $2, $3, $4, 'wechat_miniprogram', now())`,
        [userId, identity.phone, identity.openid, identity.unionid]
      );
    } else {
      await updateWechatAccount(client, userId, identity);
    }

    await client.query(
      `INSERT INTO public.login_identities
        (user_id, provider, provider_subject, phone_verified_at)
       VALUES ($1, 'wechat', $2, now())`,
      [userId, identity.openid]
    );

    return { userId, phone: identity.phone };
  });
}

type TransactionClient = Parameters<Parameters<typeof withTransaction>[0]>[0];

async function updateWechatAccount(
  client: TransactionClient,
  userId: string,
  identity: VerifiedWechatIdentity
) {
  await client.query(
    `UPDATE public.app_accounts
        SET phone = COALESCE(phone, $2), updated_at = now()
      WHERE id = $1 AND is_active = true`,
    [userId, identity.phone]
  );
  await client.query(
    `UPDATE public.profiles
        SET phone = $2,
            wechat_openid = $3,
            wechat_unionid = COALESCE($4, wechat_unionid),
            last_login_channel = 'wechat_miniprogram',
            last_login_at = now(),
            updated_at = now()
      WHERE id = $1`,
    [userId, identity.phone, identity.openid, identity.unionid]
  );
}
