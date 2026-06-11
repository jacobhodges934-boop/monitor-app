import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "./sidebar";
import projects from "../projects.json";

export const metadata: Metadata = {
  title: "Dev Monitor — 多项目开发监控面板",
  description: "监控 continuous-claude 自主开发进度",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="flex min-h-screen">
        <Sidebar projects={projects} />
        <main className="flex-1 ml-[260px] p-6 lg:p-8 min-w-0">{children}</main>
      </body>
    </html>
  );
}
