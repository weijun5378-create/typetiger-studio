import type { Metadata } from "next";
import "./globals.css";
import "./reference-layout.css";

export const metadata: Metadata = {
  title: { default: "Typetiger Studio", template: "%s — Typetiger Studio" },
  description: "Typetiger Studio 是设计总监的个人作品集与设计思考，关注产品、品牌、包装与 CMF。",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
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
