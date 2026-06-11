"use client";

import { useEffect, useState } from "react";
import { fetchMonitorData } from "./monitor-client";
import type { ProjectEntry } from "./monitor-types";

interface Snapshot {
  status: string;
  tasksDone: number;
  tasksTotal: number;
  prsOpen: number;
  iterations: number;
  costTotal: string;
}

export function ProjectCard({
  project,
  refreshKey,
}: {
  project: ProjectEntry;
  refreshKey: number;
}) {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!project.apiUrl) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const json = await fetchMonitorData<{
          status?: string;
          tasks?: { done?: number; total?: number };
          prs?: { open?: unknown[] };
          cost?: { iterations?: number; total_cny?: string };
        }>(project.slug);
        if (cancelled) return;
        setSnap({
          status: json.status || "healthy",
          tasksDone: json.tasks?.done || 0,
          tasksTotal: json.tasks?.total || 0,
          prsOpen: json.prs?.open?.length || 0,
          iterations: json.cost?.iterations || 0,
          costTotal: json.cost?.total_cny || "0",
        });
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "无法连接");
        }
      }
    };

    fetchData();
    const t = setInterval(fetchData, 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [project.apiUrl, project.slug, refreshKey]);

  const taskPct =
    snap && snap.tasksTotal > 0
      ? Math.round((snap.tasksDone / snap.tasksTotal) * 100)
      : 0;

  const statusColor = !project.apiUrl
    ? "var(--color-text-muted)"
    : error
    ? "var(--color-error)"
    : snap?.status === "error"
    ? "var(--color-error)"
    : snap?.status === "warning"
    ? "var(--color-warning)"
    : "var(--color-success)";

  return (
    <div
      className="rounded-xl border p-5 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
      style={{
        background: "var(--color-surface)",
        borderColor: "var(--color-border)",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ background: statusColor }}
        />
        <div className="min-w-0">
          <h3
            className="font-semibold truncate"
            style={{ color: "var(--color-text)" }}
          >
            {project.name}
          </h3>
          <p
            className="text-xs truncate"
            style={{ color: "var(--color-text-muted)" }}
          >
            {project.description}
          </p>
        </div>
      </div>

      {/* Indicators */}
      {project.apiUrl ? (
        snap ? (
          <div>
            {error && (
              <p className="text-xs mb-3" style={{ color: "var(--color-warning)" }}>
                刷新失败，显示上次数据
              </p>
            )}
            <div className="grid grid-cols-4 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
                {snap.prsOpen}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                GitHub PR
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
                {snap.tasksDone}/{snap.tasksTotal}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                本地任务 / Tasks
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "var(--color-accent)" }}>
                {snap.iterations}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                轮次 / Runs
              </div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold" style={{ color: "var(--color-success)" }}>
                ¥{snap.costTotal}
              </div>
              <div className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                花费 / Cost
              </div>
            </div>
          </div>
          </div>
        ) : error ? (
          <p className="text-sm" style={{ color: "var(--color-error)" }}>
            {error.includes("响应超时") ? "响应超时" : "无法连接"} · 请确认项目已启动
          </p>
        ) : (
          <CardSkeleton />
        )
      ) : (
        <p className="text-sm" style={{ color: "var(--color-text-muted)" }}>
          未配置 API · 待配置
        </p>
      )}

      {/* Progress bar */}
      {snap && snap.tasksTotal > 0 && (
        <div
          className="mt-3 h-1.5 rounded-full overflow-hidden"
          style={{ background: "var(--color-border)" }}
        >
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${taskPct}%`,
              background: "var(--color-accent)",
            }}
          />
        </div>
      )}
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="grid grid-cols-4 gap-3" aria-label="正在加载监控数据">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="text-center">
          <div
            className="mx-auto h-7 w-10 rounded animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="mx-auto mt-2 h-3 w-8 rounded animate-pulse"
            style={{ background: "var(--color-border)", opacity: 0.65 }}
          />
        </div>
      ))}
    </div>
  );
}
