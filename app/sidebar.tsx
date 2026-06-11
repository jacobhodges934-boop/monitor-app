"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface ProjectEntry {
  slug: string;
  name: string;
  description: string;
  repo: string;
  apiUrl: string | null;
  repoUrl: string;
}

export function Sidebar({ projects }: { projects: ProjectEntry[] }) {
  const pathname = usePathname();

  return (
    <aside
      className="fixed left-0 top-0 h-full w-[260px] flex flex-col border-r z-30"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="p-5 border-b" style={{ borderColor: "var(--color-border)" }}>
        <Link href="/" className="no-underline">
          <h1 className="text-lg font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
            <span style={{ color: "var(--color-accent)" }}>●</span> Dev Monitor
          </h1>
          <p className="text-xs mt-1" style={{ color: "var(--color-text-muted)" }}>
            多项目开发监控
          </p>
        </Link>
      </div>

      {/* Project list */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="px-2 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
          项目列表
        </p>
        {projects.map((proj) => {
          const active = pathname === `/project/${proj.slug}`;
          return (
            <Link
              key={proj.slug}
              href={`/project/${proj.slug}`}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm no-underline transition-colors duration-150"
              style={{
                background: active ? "var(--color-accent)" : "transparent",
                color: active ? "#fff" : "var(--color-text)",
                opacity: proj.apiUrl ? 1 : 0.5,
              }}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  background: proj.apiUrl ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              />
              <div className="min-w-0">
                <div className="font-medium truncate">{proj.name}</div>
                <div className="text-xs truncate" style={{ opacity: 0.65 }}>
                  {proj.apiUrl ? "已配置" : "待配置"}
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t text-xs" style={{ borderColor: "var(--color-border)", color: "var(--color-text-muted)" }}>
        Auto-refresh 10s · localhost:3334
      </div>
    </aside>
  );
}
