"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/stitch/material-icon";
import { formatAuthLoginError } from "@/lib/auth/login-error";
import { WECHAT_MOCK_DEFAULTS } from "@/lib/auth/wechat-types";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"wechat" | "email">("wechat");
  const [wechatId, setWechatId] = useState<string>(WECHAT_MOCK_DEFAULTS.wechat_id);
  const [phone, setPhone] = useState<string>(WECHAT_MOCK_DEFAULTS.phone);
  const [email, setEmail] = useState("demo_user_1@warmrobot.dev");
  const [password, setPassword] = useState("password123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const configError = new URLSearchParams(window.location.search).get("error");
    if (configError) setError(configError);
  }, []);

  async function handleWechatMockLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/wechat/mock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openid: WECHAT_MOCK_DEFAULTS.openid,
          wechat_id: wechatId,
          phone,
          display_name: WECHAT_MOCK_DEFAULTS.display_name,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "微信登录失败");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "登录失败，请重试");
        return;
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(formatAuthLoginError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-[var(--spacing-margin-mobile)] pt-safe pb-safe">
      <div className="w-full max-w-md rounded-[2rem] border border-surface-container-highest bg-surface-container-lowest p-8 cloud-shadow">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <MaterialIcon name="child_care" className="text-[32px]" filled />
          </div>
          <h1 className="font-display-lg-mobile text-primary">暖宝宝</h1>
          <p className="mt-2 font-body-md text-on-surface-variant">登录后查看今日穿搭推荐</p>
        </div>

        <div className="mb-6 flex rounded-full bg-surface-container p-1">
          <button
            type="button"
            className={`font-label-md flex-1 rounded-full py-2 transition ${
              mode === "wechat"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setMode("wechat")}
          >
            微信登录
          </button>
          <button
            type="button"
            className={`font-label-md flex-1 rounded-full py-2 transition ${
              mode === "email"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
            onClick={() => setMode("email")}
          >
            邮箱登录
          </button>
        </div>

        {mode === "wechat" ? (
          <form onSubmit={handleWechatMockLogin} className="space-y-4">
            <p className="rounded-xl bg-surface-container px-3 py-2 font-body-md text-sm text-on-surface-variant">
              本地 Mock：用户标识为<strong className="text-on-surface">微信号 + 手机号</strong>
              。线上将走 wx.login → openid 绑定。
            </p>
            <div>
              <label htmlFor="wechat_id" className="mb-1 block font-label-caps text-on-surface-variant">
                微信号
              </label>
              <input
                id="wechat_id"
                type="text"
                value={wechatId}
                onChange={(e) => setWechatId(e.target.value)}
                className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                required
              />
            </div>
            <div>
              <label htmlFor="phone" className="mb-1 block font-label-caps text-on-surface-variant">
                手机号
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-secondary-fixed px-3 py-2 font-body-md text-on-secondary-fixed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="font-label-caps flex w-full items-center justify-center gap-2 rounded-full bg-[#07C160] py-3 text-white transition hover:opacity-90 disabled:opacity-60"
            >
              <MaterialIcon name="chat" className="text-[20px]" />
              {loading ? "登录中…" : "微信 Mock 登录"}
            </button>

            <p className="text-center font-body-md text-sm text-on-surface-variant">
              默认：{WECHAT_MOCK_DEFAULTS.wechat_id} / {WECHAT_MOCK_DEFAULTS.phone}
            </p>
          </form>
        ) : (
          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block font-label-caps text-on-surface-variant">
                邮箱
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                required
              />
            </div>
            <div>
              <label
                htmlFor="password"
                className="mb-1 block font-label-caps text-on-surface-variant"
              >
                密码
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="font-body-md w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none transition-colors focus:border-primary"
                required
              />
            </div>

            {error && (
              <p className="rounded-xl bg-secondary-fixed px-3 py-2 font-body-md text-on-secondary-fixed">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="font-label-caps w-full rounded-full bg-primary py-3 text-on-primary transition hover:opacity-90 disabled:opacity-60"
            >
              {loading ? "登录中…" : "登录"}
            </button>

            <p className="text-center font-body-md text-sm text-on-surface-variant">
              Demo：demo_user_1@warmrobot.dev / password123
              <br />
              远程库需先执行 <code className="text-xs">npm run db:seed-demo -w web</code>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
