"use client";

import { useRouter } from "next/navigation";

type Props = {
  next?: string;
  className?: string;
  children?: React.ReactNode;
};

/** Sign out and return to login (needed when session exists but email ∉ ADMIN_EMAILS). */
export function AdminSignOutLink({
  next = "/admin",
  className,
  children = "返回登录",
}: Props) {
  const router = useRouter();

  async function handleClick() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push(`/login?next=${encodeURIComponent(next)}`);
    router.refresh();
  }

  return (
    <button type="button" onClick={handleClick} className={className}>
      {children}
    </button>
  );
}
