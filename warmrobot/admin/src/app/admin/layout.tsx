import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin-sidebar";
import { requireAdmin } from "@/lib/admin/auth";
import { getWebAppUrl } from "@/lib/env";

export default async function AdminShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  if (!session) {
    redirect("/login?next=/admin");
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
