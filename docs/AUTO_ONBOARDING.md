# 自动接入新项目

目标：以后 Claude Code 或 Codex 新建项目后，只登记一次，Dev Monitor 就能自动分配端口、写入 `projects.json`，并由 `start-all.ps1` 一键启动。

## 推荐流程

1. 新项目创建完成后，运行登记脚本：

```powershell
pwsh D:\文档\monitor-app\register-project.ps1 -Path "D:\文档\我的新项目" -Name "我的新项目" -Repo "owner/repo"
```

2. 确保该项目提供：

```text
/api/monitor
```

3. 以后只运行：

```powershell
pwsh D:\文档\monitor-app\start-all.ps1
```

4. 访问：

```text
电脑: http://localhost:3334
手机: 使用 start-all.ps1 打印的 http://局域网IP:3334
```

## 端口规则

- `3334`: Dev Monitor
- `3001+`: 被监控项目自动分配

登记脚本会避开已经写入 `projects.json` 的端口，也会避开当前正在监听的端口。

## 给 Claude Code / Codex 的交接话术

新项目完成基础初始化后，请执行：

```powershell
pwsh D:\文档\monitor-app\register-project.ps1 -Path "<项目本地路径>" -Name "<显示名称>" -Repo "<owner/repo>"
```

如果项目是 Next.js App Router，请同时添加 `/api/monitor`，返回 Dev Monitor 需要的监控 JSON。
