import { NextRequest } from "next/server";
import projectsJson from "../../../projects.json";
import type { ProjectEntry } from "../../monitor-types";

const PROJECTS = projectsJson as ProjectEntry[];
const TIMEOUT_MS = 5000;
const DISCOVERY_TIMEOUT_MS = 1200;
const MAX_ATTEMPTS = 3;
const COMMON_LOCAL_PORTS = [
  3000, 3001, 3002, 3003, 3004, 3005, 3006, 3007, 3008, 3009, 3010, 3333, 3334,
];
const discoveredUrls = new Map<string, string>();

function jsonError(status: number, error: string, detail?: string, attempts?: number) {
  return Response.json(
    { error, detail, attempts },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function errorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.name === "AbortError" ? "响应超时" : error.message;
  }
  return String(error);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(url: string, timeoutMs = TIMEOUT_MS) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

function isLocalMonitorUrl(apiUrl: string) {
  try {
    const parsed = new URL(apiUrl);
    return ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  } catch {
    return false;
  }
}

function buildLocalCandidates(apiUrl: string) {
  const parsed = new URL(apiUrl);
  const configured = parsed.toString();
  const candidates = COMMON_LOCAL_PORTS.map((port) => {
    const next = new URL(parsed);
    next.port = String(port);
    return next.toString();
  });

  return [configured, ...candidates.filter((url) => url !== configured)];
}

function matchesProject(project: ProjectEntry, data: unknown) {
  if (!data || typeof data !== "object") {
    return false;
  }

  const monitorData = data as { repo?: string; project?: string };
  if (project.repo) {
    return monitorData.repo === project.repo;
  }

  return monitorData.project === project.name || monitorData.project === project.slug;
}

async function discoverLocalMonitor(project: ProjectEntry) {
  if (!project.apiUrl || !isLocalMonitorUrl(project.apiUrl)) {
    return null;
  }

  const candidates = buildLocalCandidates(project.apiUrl);
  const checks = candidates.map(async (candidate) => {
    try {
      const res = await fetchWithTimeout(candidate, DISCOVERY_TIMEOUT_MS);
      if (res.ok && matchesProject(project, await res.json())) {
        discoveredUrls.set(project.slug, candidate);
        return candidate;
      }
    } catch {
      // Ignore failed probes; discovery only needs one healthy local endpoint.
    }
    return null;
  });

  const results = await Promise.all(checks);
  return results.find(Boolean) || null;
}

async function fetchMonitor(slug: string, apiUrl: string) {
  const cachedUrl = discoveredUrls.get(slug);
  const urls = cachedUrl && cachedUrl !== apiUrl ? [cachedUrl, apiUrl] : [apiUrl];

  let lastError = "";
  for (const url of urls) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const upstream = await fetchWithTimeout(url);
        const body = await upstream.text();

        if (!upstream.ok) {
          return {
            ok: false as const,
            status: upstream.status,
            error: "监控端点返回错误",
            detail: `HTTP ${upstream.status}`,
            attempts: attempt,
          };
        }

        discoveredUrls.set(slug, url);
        return { ok: true as const, body, upstream, attempts: attempt, url };
      } catch (error) {
        lastError = errorMessage(error);
        if (attempt < MAX_ATTEMPTS) {
          await delay(250 * attempt);
        }
      }
    }
  }

  return {
    ok: false as const,
    status: lastError === "响应超时" ? 504 : 502,
    error: lastError === "响应超时" ? "响应超时" : "无法连接监控端点",
    detail: lastError,
    attempts: MAX_ATTEMPTS,
  };
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug");

  if (!slug) {
    return jsonError(400, "缺少项目 slug");
  }

  const project = PROJECTS.find((item) => item.slug === slug);
  if (!project) {
    return jsonError(404, "项目未配置", slug);
  }

  if (!project.apiUrl) {
    return jsonError(400, "项目尚未配置监控 API", project.name);
  }

  const result = await fetchMonitor(slug, project.apiUrl);

  if (!result.ok && isLocalMonitorUrl(project.apiUrl)) {
    const discoveredUrl = await discoverLocalMonitor(project);
    if (discoveredUrl) {
      const discoveredResult = await fetchMonitor(slug, discoveredUrl);
      if (discoveredResult.ok) {
        return new Response(discoveredResult.body, {
          status: 200,
          headers: {
            "Cache-Control": "no-store",
            "Content-Type":
              discoveredResult.upstream.headers.get("Content-Type") ||
              "application/json; charset=utf-8",
            "X-Monitor-Attempts": String(discoveredResult.attempts),
            "X-Monitor-Resolved-Url": discoveredResult.url,
          },
        });
      }
    }
  }

  if (!result.ok) {
    return jsonError(result.status, result.error, result.detail, result.attempts);
  }

  return new Response(result.body, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": result.upstream.headers.get("Content-Type") || "application/json; charset=utf-8",
      "X-Monitor-Attempts": String(result.attempts),
      "X-Monitor-Resolved-Url": result.url,
    },
  });
}
