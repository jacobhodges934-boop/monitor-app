export class MonitorFetchError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MonitorFetchError";
    this.status = status;
  }
}

export async function fetchMonitorData<T>(slug: string): Promise<T> {
  const res = await fetch(`/api/monitor-proxy?slug=${encodeURIComponent(slug)}`, {
    cache: "no-store",
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { error?: string; detail?: string };
      message = body.detail ? `${body.error}: ${body.detail}` : body.error || message;
    } catch {
      // Keep the HTTP status message when the proxy cannot return JSON.
    }
    throw new MonitorFetchError(message, res.status);
  }

  return (await res.json()) as T;
}
