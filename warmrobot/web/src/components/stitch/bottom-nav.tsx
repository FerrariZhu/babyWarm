"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MaterialIcon } from "./material-icon";

const tabs = [
  { href: "/", label: "首页", icon: "home", filledWhenActive: true },
  { href: "/records", label: "穿衣记录", icon: "event_note", filledWhenActive: true },
  { href: "/profile", label: "我的", icon: "person", filledWhenActive: true },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="主导航"
      className="fixed bottom-0 left-0 z-50 w-full border-t border-outline-variant/40 bg-surface-container-lowest px-2 pt-1.5 pb-safe shadow-[0px_-4px_12px_rgba(0,0,0,0.05)] md:hidden"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around">
        {tabs.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <li key={tab.href} className="flex min-w-0 flex-1">
              <Link
                href={tab.href}
                prefetch={true}
                aria-current={active ? "page" : undefined}
                className={`group flex min-h-touch-target-min w-full flex-col items-center justify-center gap-0.5 px-2 py-1 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-container-lowest ${
                  active
                    ? "text-primary"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span
                  className={`flex h-8 w-12 items-center justify-center rounded-xl transition-colors duration-200 ${
                    active
                      ? "bg-primary-fixed text-primary"
                      : "bg-transparent group-hover:bg-surface-container-low"
                  }`}
                >
                  <MaterialIcon
                    name={tab.icon}
                    filled={active && tab.filledWhenActive}
                    className="text-[22px] leading-none"
                  />
                </span>
                <span
                  className={`font-label-sm whitespace-nowrap leading-none ${
                    active ? "font-semibold" : "font-medium"
                  }`}
                >
                  {tab.label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
