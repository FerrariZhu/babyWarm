"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "@/components/material-icon";

const NAV_ITEMS = [
  {
    href: "/admin/variants",
    label: "品类与细类型",
    icon: "view_list",
    description: "槽位 · 保暖值 · C 端文案",
  },
  {
    href: "/admin/users",
    label: "用户信息",
    icon: "group",
    description: "用户与宝宝档案记录",
  },
] as const;

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-outline-variant/40 bg-surface-container-lowest">
      <div className="border-b border-outline-variant/40 px-5 py-5">
        <Link href="/admin" className="font-headline-md block text-primary">
          暖宝宝
        </Link>
        <p className="font-label-sm mt-1 text-text-soft">配置后台</p>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface"
              }`}
            >
              <MaterialIcon
                name={item.icon}
                className={`mt-0.5 text-[20px] ${active ? "fill-icon" : ""}`}
              />
              <span className="min-w-0">
                <span className="font-label-md block">{item.label}</span>
                <span className="font-label-sm mt-0.5 block text-text-soft">{item.description}</span>
              </span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
