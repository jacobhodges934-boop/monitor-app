"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import projects from "../../../projects.json";
import { fetchMonitorData } from "../../monitor-client";
import type { MonitorData } from "../../monitor-types";

export default function ProjectDetail() {
  const { slug } = useParams<{ slug: string }>();
  const project = projects.find((p) => p.slug === slug);

  const [data, setData] = useState<MonitorData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(!!project?.apiUrl);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(
    async (cancelled: () => boolean, showRefreshing = false) => {
      if (!project?.apiUrl) return;

      if (showRefreshing) setRefreshing(true);
      try {
        const json = await fetchMonitorData<MonitorData>(project.slug);
        if (!cancelled()) {
          setData(json);
          setError("");
        }
      } catch (err) {
        if (!cancelled()) {
          setError(err instanceof Error ? err.message : `无法连接: ${project.apiUrl}`);
        }
      } finally {
        if (!cancelled()) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [project?.apiUrl, project?.slug],
  );

  useEffect(() => {
    if (!project?.apiUrl) return;

    let cancelled = false;
    const isCancelled = () => cancelled;

    loadData(isCancelled);
    const t = setInterval(() => loadData(isCancelled), 10000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [loadData, project?.apiUrl]);

  const handleRefresh = () => {
    void loadData(() => false, true);
  };

  // --- Not found ---
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h2 className="text-4xl" style={{ color: "var(--color-text-muted)" }}>404</h2>
        <p style={{ color: "var(--color-text-muted)" }}>项目 &quot;{slug}&quot; 未配置</p>
        <Link
          href="/"
          className="px-4 py-2 rounded-lg text-sm font-medium no-underline transition-colors"
          style={{ background: "var(--color-accent)", color: "#fff" }}
        >
          返回总览
        </Link>
      </div>
    );
  }

  // --- Not configured ---
  if (!project.apiUrl) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm no-underline hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← 返回总览
        </Link>
        <div className="mt-6 text-center py-20 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <span className="text-4xl">🔌</span>
          <h2 className="text-xl font-semibold mt-4" style={{ color: "var(--color-text)" }}>
            {project.name}
          </h2>
          <p className="mt-2" style={{ color: "var(--color-text-muted)" }}>
            该项目尚未配置 <code>/api/monitor</code> 端点
          </p>
          {project.repoUrl && (
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block mt-4 px-4 py-2 rounded-lg text-sm font-medium no-underline"
              style={{ background: "var(--color-accent)", color: "#fff" }}
            >
              GitHub →
            </a>
          )}
        </div>
      </div>
    );
  }

  // --- Loading ---
  if (loading) {
    return <DetailSkeleton />;
  }

  // --- Error ---
  if (error && !data) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link
          href="/"
          className="text-sm no-underline hover:opacity-70 transition-opacity"
          style={{ color: "var(--color-text-muted)" }}
        >
          ← 返回总览
        </Link>
        <div className="mt-6 text-center py-20 rounded-xl border" style={{ borderColor: "var(--color-border)", background: "var(--color-surface)" }}>
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-semibold mt-4" style={{ color: "var(--color-error)" }}>
            连接失败
          </h2>
          <p className="mt-2" style={{ color: "var(--color-text-muted)" }}>
            {error.includes("响应超时") ? "响应超时" : error}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--color-text-muted)" }}>
            请确认被监控项目的 dev server 已启动
          </p>
          <button
            type="button"
            className="mt-4 rounded-lg px-4 py-2 text-sm font-medium transition-opacity hover:opacity-85 disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "#fff" }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "刷新中..." : "立即刷新"}
          </button>
        </div>
      </div>
    );
  }

  // --- Data loaded ---
  if (!data) return null;

  // Defensive defaults for potentially missing fields
  const prs = data.prs || { open: [], merged: [] };
  const tasks = data.tasks || { done: 0, total: 0, remaining: [] };
  const cost = data.cost || { total_cny: "0", total_usd: "0", last_cny: "0", last_usd: "0", iterations: 0, currency: "" };
  const build = data.build || { status: "unknown" };
  const status = data.status || "healthy";

  const taskPct = tasks.total > 0 ? Math.round((tasks.done / tasks.total) * 100) : 0;
  const statusLabel =
    status === "error" ? "故障" : status === "warning" ? "警告" : "健康";
  const statusColor =
    status === "error"
      ? "var(--color-error)"
      : status === "warning"
      ? "var(--color-warning)"
      : "var(--color-success)";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="text-sm no-underline hover:opacity-70 transition-opacity"
        style={{ color: "var(--color-text-muted)" }}
      >
        ← 返回总览
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="w-3 h-3 rounded-full" style={{ background: statusColor }} />
          <h2 className="text-2xl font-bold" style={{ color: "var(--color-text)" }}>
            {data.project}
          </h2>
          <span
            className="px-2 py-0.5 rounded-full text-xs font-medium"
            style={{
              background: statusColor,
              color: "#fff",
            }}
          >
            {statusLabel}
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 text-xs" style={{ color: "var(--color-text-muted)" }}>
          {data.repo && (
            <a
              href={`https://github.com/${data.repo}`}
              target="_blank"
              rel="noreferrer"
              className="no-underline hover:underline"
              style={{ color: "var(--color-accent)" }}
            >
              {data.repo}
            </a>
          )}
          <span>·</span>
          <span>更新 / Updated: {new Date(data.updated_at).toLocaleTimeString()}</span>
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-opacity hover:opacity-85 disabled:opacity-60"
            style={{ background: "var(--color-accent)", color: "#fff" }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? "刷新中..." : "立即刷新"}
          </button>
        </div>
      </div>

      {error && (
        <div
          className="rounded-lg border px-3 py-2 text-sm mb-4"
          style={{
            background: "var(--color-surface)",
            borderColor: "var(--color-warning)",
            color: "var(--color-warning)",
          }}
        >
          刷新失败，当前显示上次成功数据：{error.includes("响应超时") ? "响应超时" : error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard label="GitHub 待合并 PR" english="Open PRs" value={prs.open.length} color="var(--color-text)" />
        <MetricCard label="本地任务清单进度" english="Local Tasks Done" value={`${tasks.done}/${tasks.total}`} color="var(--color-text)" />
        <MetricCard label="运行轮次" english="Iterations" value={cost.iterations} color="var(--color-accent)" />
        <MetricCard label="累计花费" english="Total Cost" value={`¥${cost.total_cny}`} sub={`≈ $${cost.total_usd}`} color="var(--color-success)" />
      </div>

      {/* Progress bar */}
      <div
        className="rounded-xl border p-4 mb-6"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex justify-between text-sm mb-2">
          <span style={{ color: "var(--color-text-muted)" }}>任务完成度</span>
          <span className="font-semibold" style={{ color: "var(--color-text)" }}>
            {taskPct}%
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-border)" }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${taskPct}%`, background: "var(--color-accent)" }}
          />
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <Tag label={`分支 / Branch: ${data.branch}`} />
          <Tag label={data.dirty ? "有未提交改动 / Dirty" : "工作区干净 / Clean"} accent={data.dirty} />
          <Tag label={`构建 / Build: ${build.status}`} accent={build.status === "failure"} />
          <Tag label={`最近花费 / Last: ¥${cost.last_cny || "0"}`} />
          <Tag label={data.gh_token_configured ? "GitHub 已配置 / Ready" : "GitHub 未配置，PR/CI 可能不完整 / Missing"} accent={!data.gh_token_configured} />
        </div>
      </div>

      {/* PR Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <PRSection
          title="GitHub 待合并 PR / Open PRs"
          color="var(--color-warning)"
          prs={prs.open}
          emptyText="暂无待处理 PR / No open PRs"
        />
        <PRSection
          title="最近合并（最多 10 个）/ Recently Merged"
          color="var(--color-success)"
          prs={prs.merged}
          emptyText="暂无已合并 PR / No merged PRs"
        />
      </div>

      {/* Remaining Tasks */}
      <div
        className="rounded-xl border p-4"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <h3 className="font-semibold mb-3" style={{ color: "var(--color-text)" }}>
          剩余任务 / Remaining Tasks ({tasks.remaining.length})
        </h3>
        {tasks.remaining.length === 0 ? (
          <p style={{ color: "var(--color-success)" }}>✓ 全部完成!</p>
        ) : (
          <ul className="space-y-1.5 list-none p-0 m-0">
            {tasks.remaining.map((t, i) => (
              <li
                key={i}
                className="text-sm flex items-start gap-2"
                style={{ color: "var(--color-text-muted)" }}
              >
                <span style={{ color: "var(--color-border)" }}>○</span>
                {t}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs" style={{ color: "var(--color-text-muted)" }}>
        每 10 秒自动刷新 / Auto-refresh every 10s · {new Date(data.updated_at).toLocaleString()}
      </div>
    </div>
  );
}

/* ---- mini components ---- */

function MetricCard({
  label,
  english,
  value,
  sub,
  color,
}: {
  label: string;
  english: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <div
      className="rounded-xl border p-4 text-center"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <div className="text-2xl lg:text-3xl font-bold" style={{ color }}>
        {value}
      </div>
      <div className="text-sm mt-1" style={{ color: "var(--color-text)" }}>
        {label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)" }}>
        {english}
      </div>
      {sub && (
        <div className="text-xs mt-0.5" style={{ color: "var(--color-text-muted)", opacity: 0.7 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto" aria-label="正在加载项目详情">
      <div
        className="h-4 w-20 rounded animate-pulse"
        style={{ background: "var(--color-border)" }}
      />
      <div className="flex flex-wrap items-center justify-between gap-4 mt-4 mb-6">
        <div className="flex items-center gap-3">
          <div
            className="h-3 w-3 rounded-full animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-8 w-48 rounded animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-5 w-12 rounded-full animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
        </div>
        <div
          className="h-8 w-28 rounded-lg animate-pulse"
          style={{ background: "var(--color-border)" }}
        />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="rounded-xl border p-4"
            style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
          >
            <div
              className="mx-auto h-9 w-16 rounded animate-pulse"
              style={{ background: "var(--color-border)" }}
            />
            <div
              className="mx-auto mt-2 h-3 w-20 rounded animate-pulse"
              style={{ background: "var(--color-border)", opacity: 0.65 }}
            />
          </div>
        ))}
      </div>
      <div
        className="rounded-xl border p-4 mb-6"
        style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
      >
        <div className="flex justify-between mb-3">
          <div
            className="h-4 w-24 rounded animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
          <div
            className="h-4 w-10 rounded animate-pulse"
            style={{ background: "var(--color-border)" }}
          />
        </div>
        <div
          className="h-2 rounded-full animate-pulse"
          style={{ background: "var(--color-border)" }}
        />
      </div>
    </div>
  );
}

function Tag({ label, accent }: { label: string; accent?: boolean }) {
  return (
    <span
      className="px-2 py-0.5 rounded text-xs font-medium"
      style={{
        background: accent ? "var(--color-error)" : "var(--color-border)",
        color: accent ? "#fff" : "var(--color-text-muted)",
        opacity: accent === undefined ? 1 : undefined,
      }}
    >
      {label}
    </span>
  );
}

function PRSection({
  title,
  color,
  prs,
  emptyText,
}: {
  title: string;
  color: string;
  prs: { number: number; title: string; url: string }[];
  emptyText: string;
}) {
  return (
    <div
      className="rounded-xl border p-4"
      style={{ background: "var(--color-surface)", borderColor: "var(--color-border)" }}
    >
      <h3 className="font-semibold text-sm mb-3" style={{ color }}>
        {title} ({prs.length})
      </h3>
      {prs.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
          {emptyText}
        </p>
      ) : (
        <ul className="space-y-1.5 list-none p-0 m-0">
          {prs.map((p) => (
            <li key={p.number}>
              <a
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="text-sm no-underline hover:underline truncate block"
                style={{ color: "var(--color-accent)" }}
              >
                #{p.number} {p.title}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
