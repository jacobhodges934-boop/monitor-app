export interface ProjectEntry {
  slug: string;
  name: string;
  description: string;
  repo: string;
  apiUrl: string | null;
  repoUrl: string;
  localPath?: string;
  devPort?: number;
  devCommand?: string;
  monitorPath?: string;
}

export interface MonitorData {
  project: string;
  repo: string;
  branch: string;
  dirty: boolean;
  status: "healthy" | "warning" | "error";
  prs: {
    open: { number: number; title: string; url: string }[];
    merged: { number: number; title: string; url: string }[];
  };
  tasks: { done: number; total: number; remaining: string[] };
  cost: {
    total_cny: string;
    total_usd: string;
    last_cny?: string;
    last_usd: string;
    iterations: number;
    currency: string;
    source?: string;
  };
  build: { status: string; url?: string };
  gh_token_configured: boolean;
  updated_at: string;
}
