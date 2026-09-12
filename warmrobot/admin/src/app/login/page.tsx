"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";
import { safeAdminNextPath } from "@/lib/self-hosted/admin-auth-policy.mjs";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    if (err) setError(err);
  }, [searchParams]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    setLoading(false);
    if (!response.ok) {
      setError(result?.error ?? "登录暂时不可用");
      return;
    }

    const next = safeAdminNextPath(searchParams.get("next"));
    router.push(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6">
      <div className="w-full max-w-md rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-8 shadow-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-container text-on-primary-container">
            <MaterialIcon name="settings" className="text-[28px]" />
          </div>
          <h1 className="font-headline-md text-primary">暖宝宝 配置</h1>
          <p className="mt-2 font-body-md text-text-soft">管理员登录</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block font-label-sm text-text-soft">
              邮箱
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="font-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block font-label-sm text-text-soft">
              密码
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="font-body-md w-full rounded-lg border border-outline-variant bg-surface px-4 py-3"
              required
            />
          </div>

          {error && (
            <p className="rounded-lg bg-error-container/50 px-3 py-2 font-body-md text-on-error-container">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="font-label-md w-full rounded-lg bg-primary py-3 text-on-primary disabled:opacity-60"
          >
            {loading ? "登录中…" : "登录"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center font-body-md">加载中…</div>}>
      <LoginForm />
    </Suspense>
  );
}
