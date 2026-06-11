# Dev Monitor — 多项目开发监控面板

> Codex / Codex 接手开发的入口文档。

## 项目定位

独立的多项目开发监控 Web 面板。监控 continuous-Codex-deepseek 在多个项目上的自主开发进度（PR、任务完成度、花费、CI 状态）。

**目录**: `D:\文档\monitor-app\`（和所有被监控项目平级，不隶属任何项目）

## 技术栈

| 层 | 技术 |
|---|------|
| 框架 | Next.js 16 (App Router, Turbopack) |
| 语言 | TypeScript (strict) |
| 样式 | Tailwind CSS 4 + CSS 变量（浅色/深色自适应） |
| 数据 | 各被监控项目暴露 `/api/monitor`，Monitor App 前端 10s 轮询 |
| 配置 | `projects.json`（静态 JSON，项目列表） |

## 启动

```powershell
# 开发模式（端口 3334）
cd D:\文档\monitor-app
npm run dev

# 或一键脚本
pwsh D:\文档\monitor-app\start.ps1

# 切换端口
pwsh D:\文档\monitor-app\start.ps1 -Port 3456
```

**前提**: 被监控项目的 dev server 必须已启动，否则 API 请求失败。

## 目录结构

```
monitor-app/
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── projects.json              ← 项目列表（新增项目只改这个）
├── start.ps1                  ← 启动脚本
├── docs/                      ← 文档
│   ├── ARCHITECTURE.md
│   └── NEXT_TASKS.md
└── app/
    ├── globals.css            ← 主题变量 + 全局样式
    ├── layout.tsx             ← 根布局（侧边栏 + 内容区）
    ├── sidebar.tsx            ← 侧边栏项目导航
    ├── page.tsx               ← 首页总览（项目卡片网格）
    ├── project-card.tsx       ← 项目卡片组件（实时数据 + 状态灯）
    └── project/
        └── [slug]/
            └── page.tsx       ← 单项目详情（指标 + PR + 任务 + 进度）
```

## 数据流

```
projects.json ──→ sidebar.tsx (项目列表)
             ──→ page.tsx (总览卡片)
             ──→ project/[slug]/page.tsx (详情)

每个卡片 / 详情页 fetch(project.apiUrl) → 10s 轮询
```

### 统一 API 格式 (`/api/monitor`)

每个被监控项目需要返回：

```typescript
interface MonitorData {
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
    last_usd: string;
    iterations: number;
    currency: string;
  };
  build: { status: string; url?: string };
  gh_token_configured: boolean;
  updated_at: string;
}
```

## 添加新项目

编辑 `projects.json`，加一项：

```json
{
  "slug": "my-project",
  "name": "显示名称",
  "description": "简短描述",
  "repo": "owner/repo",
  "apiUrl": "http://localhost:XXXX/api/monitor",
  "repoUrl": "https://github.com/owner/repo"
}
```

- `apiUrl` 为 `null` 时显示"待配置"，侧边栏灰色半透明
- `slug` 用于 URL 路由 `/project/<slug>`

## 编码约定

- 样式用 inline `style={{ color: "var(--color-text)" }}` 而非 Tailwind 颜色类，以保证浅色/深色模式自动切换
- 组件内部用小函数组件（MetricCard, Tag, PRSection）保持可读性
- client component 的 fetch 必须用 `cancelled` flag 防止 unmount 后 setState
- 不要引入额外依赖（只用了 react, react-dom, next, tailwindcss, typescript）

## 已知问题 / 限制

1. **端口硬编码**: projects.json 里 apiUrl 写死了 localhost 端口，项目换端口需手动改
2. **跨域**: 开发模式下 fetch 走浏览器端，被监控项目需允许 localhost:3334 的跨域请求
3. **无后端**: 纯前端 App，无数据库，配置靠 projects.json 静态文件
4. **未部署**: 仅本地开发模式可用，未部署到 Vercel
5. **无实时推送**: 10s 轮询，非 WebSocket

## 证迹Archive 现有 `/api/monitor` 实现

路径: `D:\文档\证迹Archive\app\api\monitor\route.ts`

参考这个实现给其他项目添加 `/api/monitor`：
- PR 数据: GitHub REST API（需 GITHUB_TOKEN）
- 任务数据: 解析 `docs/NEXT_TASKS.md` 的 checkbox
- Cost 数据: 解析 `logs/Codex-stdout-*.log` 中的 JSON（total_cost_usd）
- Git 状态: `git branch --show-current` + `git status --porcelain`
- CI 状态: `gh run list`
