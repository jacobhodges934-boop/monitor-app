"use client";

import Link from "next/link";
import { useState } from "react";
import { ProjectCard } from "./project-card";
import type { ProjectEntry } from "./monitor-types";

export function OverviewDashboard({ projects }: { projects: ProjectEntry[] }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const configuredCount = projects.filter((p) => p.apiUrl).length;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight" style={{ color: "var(--color-text)" }}>
            项目概览
          </h2>
          <p className="mt-1" style={{ color: "var(--color-text-muted)" }}>
            {projects.length} 个项目 · {configuredCount} 个已配置监控
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85"
          style={{ background: "var(--color-accent)", color: "#fff" }}
          onClick={() => setRefreshKey((value) => value + 1)}
        >
          立即刷新
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => (
          <Link key={proj.slug} href={`/project/${proj.slug}`} className="no-underline">
            <ProjectCard project={proj} refreshKey={refreshKey} />
          </Link>
        ))}
      </div>

      {projects.length === 0 && (
        <div
          className="text-center py-16 rounded-xl border"
          style={{
            borderColor: "var(--color-border)",
            background: "var(--color-surface)",
          }}
        >
          <p className="text-lg font-medium" style={{ color: "var(--color-text-muted)" }}>
            暂无项目
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            编辑 <code>projects.json</code> 添加监控目标
          </p>
        </div>
      )}
    </div>
  );
}
