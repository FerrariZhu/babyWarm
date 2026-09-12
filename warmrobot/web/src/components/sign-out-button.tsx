"use client";

import { useRouter } from "next/navigation";
import { MaterialIcon } from "@/components/stitch/material-icon";

export function SignOutButton() {
  const router = useRouter();

  async function handleSignOut() {
    await fetch("/api/auth/sign-out", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      data-analytics-action="sign_out"
      onClick={handleSignOut}
      className="flex w-full items-center justify-center gap-2 rounded-full bg-surface-container-high py-3 font-label-caps text-on-surface-variant transition hover:bg-surface-container-highest"
    >
      <MaterialIcon name="logout" className="text-[18px]" />
      退出登录
    </button>
  );
}
