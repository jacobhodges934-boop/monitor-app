# 架构文档

## 整体架构

```
┌─────────────────────────────────────────────┐
│            Monitor App (:3334)              │
│  ┌──────────┐  ┌─────────────────────────┐  │
│  │ Sidebar  │  │   Main Content Area     │  │
│  │          │  │                         │  │
│  │ 项目 A ● │  │  / → ProjectCard[]      │  │
│  │ 项目 B ● │  │  /project/[slug] →      │  │
│  │ 项目 C ○ │  │    MetricGrid           │  │
│  │          │  │    ProgressBar           │  │
│  │          │  │    PRList                │  │
│  │          │  │    RemainingTasks        │  │
│  └──────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────┘
        │ 10s polling / manual refresh
        ▼
┌─────────────────────────────┐
│ Monitor App API             │
│ /api/monitor-proxy?slug=... │
│ 5s timeout + retry          │
│ localhost port discovery    │
└─────────────────────────────┘
        │ server-side fetch
        ▼
┌───────────────┐  ┌───────────────┐
│ 证迹 Archive   │  │ 项目 B        │  ...
│ :3001/api/    │  │ :3002/api/    │
│ monitor       │  │ monitor       │
└───────────────┘  └───────────────┘
```

## 路由设计

| 路由 | 类型 | 说明 |
|------|------|------|
| `/` | Static | 项目总览，从 projects.json 渲染卡片网格 |
| `/project/[slug]` | Dynamic | 单项目详情，fetch apiUrl + 10s 轮询 |

## 组件树

```
RootLayout (layout.tsx) [Server Component]
├── Sidebar (sidebar.tsx) [Client Component]
│   ├── Logo / Title
│   ├── Project links (from projects.json)
│   │   ├── 状态圆点 (green/muted)
│   │   └── 名称 + 状态文字
│   └── Footer (端口 + 刷新信息)
└── Main Content
    ├── Home Page (page.tsx) [Server Component]
    │   └── ProjectCard[] (project-card.tsx) [Client Component]
    │       ├── 状态圆点 + 名称 + 描述
    │       ├── 4 格指标预览 (PRs/Tasks/Runs/Cost)
    │       ├── 进度条
    │       └── 错误/加载/待配置 状态
    └── Project Detail (project/[slug]/page.tsx) [Client Component]
        ├── Breadcrumb (返回总览)
        ├── Header (状态灯 + 项目名 + 状态标签)
        ├── MetricGrid (4 格卡片)
        ├── ProgressBar + Tags
        ├── PRList × 2 (open + merged)
        └── RemainingTasks
```

## 主题系统

使用 CSS 自定义属性，通过 `prefers-color-scheme` 媒体查询自动切换：

```css
:root {
  --color-bg: #f8fafc;        /* 浅色背景 */
  --color-surface: #ffffff;   /* 卡片背景 */
  --color-border: #e2e8f0;   /* 边框 */
  --color-text: #0f172a;     /* 正文 */
  --color-text-muted: #64748b; /* 次要文字 */
  --color-accent: #6366f1;   /* 主题色 (indigo) */
  --color-success: #10b981;  /* 成功/健康 (green) */
  --color-warning: #f59e0b;  /* 警告 (amber) */
  --color-error: #ef4444;    /* 错误 (red) */
}

@media (prefers-color-scheme: dark) {
  :root { /* 深色覆盖 */ }
}
```

组件禁用 Tailwind 颜色类，统一用 inline style 引用变量，确保全局主题一致。

## 状态系统

| 状态 | 圆点颜色 | 触发条件 |
|------|---------|---------|
| healthy | green | API 返回 status=healthy |
| warning | yellow | dirty tree 或有 open PRs |
| error | red | CI 构建失败 或 API 不可达 |
| inactive | gray | apiUrl=null（未配置） |

## 数据获取策略

1. **Client-side fetch**: 每个卡片/详情页在 `useEffect` 中 fetch `/api/monitor-proxy?slug=...`
2. **10s 自动刷新**: `setInterval(fetchData, 10000)`
3. **cancelled flag**: 防止组件卸载后 setState
4. **Server-side proxy**: 代理按 `projects.json` slug 白名单转发，避免浏览器 CORS 问题
5. **localhost 端口发现**: 对本地项目，如果配置端口不可用，会扫描常见端口并用 repo 字段校验，发现后进程内缓存
6. **超时与重试**: 单次请求 5s 超时，最多尝试 3 次；超时显示"响应超时"
7. **错误处理**: 捕获异常 → 显示"无法连接"文字，不崩溃；已有旧数据时保留上次成功数据
8. **无缓存**: 每次 fetch 都带 `cache: no-store` 等效行为

## 扩展点

1. **WebSocket 实时推送**: 替代轮询，减少请求
2. **历史数据图表**: 存储每次 poll 的快照，画趋势图
3. **告警通知**: 状态变 red 时桌面通知
4. **多用户/多工作区**: 加载不同 projects.json
5. **部署到 Vercel**: 需要处理跨域（被监控项目也在公网）
