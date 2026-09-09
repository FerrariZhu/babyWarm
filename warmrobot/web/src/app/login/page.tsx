"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatAuthLoginError } from "@/lib/auth/login-error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error")) {
      setError("登录暂时不可用，请稍后再试。");
    }
  }, []);

  async function handleEmailLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/email/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        setError("登录未成功，请检查邮箱和密码后再试。");
        return;
      }
      router.push("/");
      router.refresh();
    } catch (loginError) {
      setError(formatAuthLoginError(loginError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page flex min-h-screen flex-col items-center justify-center bg-background px-[var(--spacing-margin-mobile)]">
      <section className="login-card w-full max-w-md">
        <h1 className="font-display-lg-mobile text-center text-primary">暖宝宝</h1>
        <p className="mt-2 text-center font-body-md text-on-surface-variant">每天穿得刚刚好</p>
        <form onSubmit={handleEmailLogin} className="mt-8 space-y-4">
          <label className="block font-label-caps text-on-surface-variant">邮箱
            <input autoComplete="username" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required className="font-body-md mt-1 w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary" />
          </label>
          <label className="block font-label-caps text-on-surface-variant">密码
            <input autoComplete="current-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required className="font-body-md mt-1 w-full rounded-xl border-2 border-surface-container-high bg-surface-container-low px-4 py-3 text-on-surface outline-none focus:border-primary" />
          </label>
          {error && <p role="alert" className="rounded-xl bg-error-container px-3 py-2 font-body-md text-on-error-container">{error}</p>}
          <button type="submit" disabled={loading} className="font-label-caps min-h-12 w-full rounded-xl bg-primary py-3 text-on-primary disabled:opacity-60">{loading ? "登录中…" : "登录"}</button>
        </form>
        <p className="mt-6 text-center font-body-md text-sm text-on-surface-variant">微信小程序请使用“微信手机号登录”。</p>
      </section>
    </main>
  );
}
