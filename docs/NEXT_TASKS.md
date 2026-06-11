# 下一阶段任务池

> Codex / Claude 接手后从此文件选任务。按优先级排序。
> 完成后标记 `[x]`。

## P0 — 核心功能完善

- [x] **自动检测项目端口**: 本地 localhost 端口失效时，代理会扫描常见端口并按 repo 校验后缓存发现结果
- [x] **CORS 处理**: Monitor App 已新增 server-side proxy，前端不再直接跨域请求项目端口
- [x] **API 超时处理**: 代理请求 5s 超时，超时后显示"响应超时"
- [x] **错误重试**: API 失败后最多请求 3 次，降低偶发抖动影响
- [x] **手动刷新按钮**: 总览与详情页均已加入"立即刷新"按钮

## P1 — 体验优化

- [x] **加载骨架屏**: 总览卡片与详情页已用 pulsing skeleton 替代"加载中..."文字
- [ ] **动画过渡**: 数据变化时数字 rollup 动画，卡片 hover 效果增强
- [ ] **项目排序/分组**: 支持按状态、名称排序，或分组（活跃/待配置）
- [ ] **离线状态缓存**: 保存上次成功拉取的数据，API 不可达时显示"上次数据 (N 秒前)"
- [ ] **深色模式手动切换**: 除了跟随系统，加 sun/moon toggle 按钮
- [ ] **响应式优化**: 移动端侧边栏折叠为 hamburger menu

## P1 — 功能扩展

- [ ] **WebSocket 实时推送**: 替代 10s 轮询，被监控项目通过 ws 推送变更
- [ ] **PR 详情弹窗**: 点击 PR 项弹出 diff 预览（不跳转 GitHub）
- [ ] **花费历史图表**: 存储 cost 时间序列，前端画折线图（不需要额外库，SVG/Canvas）
- [ ] **通知系统**: 状态变 red/warning 时浏览器 Notification API 弹通知
- [ ] **日志查看器**: 内嵌被监控项目的最近 claude 输出日志

## P2 — 架构升级

- [ ] **从静态 JSON 迁移到可编辑配置**: 前端页面内新增/编辑项目，POST 到内置 API 写回 projects.json
- [ ] **历史快照存储**: 内存 LRU 缓存最近 N 次拉取数据，画趋势图
- [ ] **多工作区支持**: 切换不同 projects.json（如 work / personal）
- [ ] **插件化项目类型**: 不预设 MonitorData schema，根据项目类型渲染不同卡片
- [ ] **认证保护**: 生产环境加简单密码或 GitHub OAuth

## P2 — 部署

- [ ] **Nginx 反向代理配置**: 统一入口，避免多端口
- [ ] **Vercel 部署**: 一键部署 Monitor App + 处理跨域
- [ ] **Docker Compose**: Monitor App + 所有被监控项目一站式启动
- [ ] **PM2 进程守护**: 确保被监控项目和 Monitor App 崩溃自动重启

## P3 — 给其他项目添加 /api/monitor

- [ ] **竞赛交流平台**: 创建 `app/api/monitor/route.ts`（参考证迹Archive 的实现）
- [ ] **continuous-claude-deepseek**: 该 repo 不是 Next.js 项目，需要单独的轻量 monitor agent

## 已完成

- [x] 证迹 Archive `/api/monitor` 数据源（GitHub PRs + 任务 + cost + CI 状态）
- [x] Monitor App 独立 Next.js 项目（layout + sidebar + 首页 + 详情页）
- [x] 多项目配置 via projects.json
- [x] 浅色/深色自适应主题
- [x] 10s 自动轮询
- [x] 状态灯系统（healthy/warning/error/inactive）
- [x] 响应式布局（桌面端侧边栏 + 卡片网格）
- [x] 构建通过（next build 0 errors）
- [x] 内置 `/api/monitor-proxy` 代理（slug 白名单 + 超时 + 重试）
- [x] localhost `/api/monitor` 端口自动发现（常见端口扫描 + repo 防串线校验）
- [x] 总览卡片与详情页加载骨架屏
- [x] 配置态/连接态文案分离：侧边栏显示"已配置"，实际连接状态由卡片红黄绿展示
- [x] 详情页关键指标改为中文 / English 双语标签
- [x] 新增 `start-all.ps1` 一键启动证迹 Archive 与 Dev Monitor，并打印电脑/手机访问地址
- [x] 明确区分 GitHub PR 指标与本地任务清单进度，避免把未完成任务误解为待处理 PR
- [x] 新增 `register-project.ps1`，为新项目自动分配端口并登记到 `projects.json`
- [x] `start-all.ps1` 改为读取 `projects.json` 的项目启动表，自动启动所有已登记项目
