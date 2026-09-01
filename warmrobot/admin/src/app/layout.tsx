import type { Metadata } from "next";
import "@fontsource-variable/material-symbols-outlined/full.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "暖宝宝 配置后台",
  description: "品类配置与用户信息中心",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
