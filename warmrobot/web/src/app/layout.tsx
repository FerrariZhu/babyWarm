import type { Metadata, Viewport } from "next";
import "@fontsource-variable/material-symbols-outlined/full.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "暖宝宝",
  description: "根据天气和宝宝档案，推荐今日穿搭",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
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
