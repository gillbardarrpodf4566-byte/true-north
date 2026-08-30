import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "见岸 · AI 公考备考教练",
  description: "看清你为什么卡在这里。见岸根据你的真实训练持续校准，告诉你此刻最值得解决的问题。",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN" data-theme="light">
      <body>{children}</body>
    </html>
  );
}
