import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { AdminSignOutLink } from "@/components/admin-sign-out-link";
import { requireAdmin } from "@/lib/admin/auth";
import { getWebAppUrl } from "@/lib/env";
import { requireUser } from "@/lib/supabase/session";

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session) {
    const userSession = await requireUser();
    if (!userSession) {
      redirect("/login?next=/admin");
    }

    const email = userSession.user.email ?? "（无邮箱）";
    const hasWhitelist = Boolean(process.env.ADMIN_EMAILS?.trim());

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-surface px-6 text-on-surface">
        <div className="max-w-md rounded-xl border border-outline-variant/50 bg-surface-container-lowest p-8 shadow-sm">
          <h1 className="font-headline-md mb-2">无配置后台权限</h1>
          <p className="font-body-md text-text-soft">
            当前登录：<span className="font-mono text-on-surface">{email}</span>
          </p>
          {!hasWhitelist ? (
            <p className="font-body-md mt-3 text-text-soft">
              未配置 <code className="text-sm">ADMIN_EMAILS</code>。请在{" "}
              <code className="text-sm">admin/.env.local</code> 写入你的邮箱后重启{" "}
              <code className="text-sm">npm run dev:admin</code>。
            </p>
          ) : (
            <p className="font-body-md mt-3 text-text-soft">
              该邮箱不在 <code className="text-sm">ADMIN_EMAILS</code>{" "}
              白名单中。把上面的邮箱加进去（逗号分隔多个），保存后重启 dev。
            </p>
          )}
          <p className="font-body-md mt-3 text-text-soft">
            写库还需要 <code className="text-sm">SUPABASE_SERVICE_ROLE_KEY</code>
            （Dashboard → Settings → API → service_role）。
          </p>
          <AdminSignOutLink
            className="font-label-md mt-6 inline-flex min-h-10 w-full items-center justify-center rounded-lg border border-outline-variant bg-surface px-4 text-primary transition hover:bg-surface-container"
          />
        </div>
      </div>
    );
  }

  const webAppUrl = getWebAppUrl();

  return (
    <div className="flex min-h-screen bg-surface text-on-surface">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end border-b border-outline-variant/40 bg-surface-container-lowest px-6 py-3">
          <a
            href={webAppUrl}
            className="font-label-sm text-text-soft hover:text-primary"
            target="_blank"
            rel="noreferrer"
          >
            打开 C 端 ↗
          </a>
        </header>
        <main className="flex-1 overflow-auto px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
