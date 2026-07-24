# TsCameraTools 项目路线图

**更新**: 2026-07-24 · 基于 `4e3e414`

---

## 一、当前进度

### 已完成 ✅

| 模块 | 功能 | 详情 |
|------|------|------|
| **Electron 桌面端** | ADB 设备管理 | 检测、自动安装、设备列表、Root、Remount |
| | ADB Shell 终端 | xterm.js + spawn，中文输入，命令历史，Ctrl+R 搜索 |
| | 本地终端 | cmd.exe 支持，独立 IPC 通道 |
| | 登录 | 自动跳过 OAuth，创建调试 token |
| | 命令历史 | 持久化到本地 JSON 文件 |
| **Web 管理后台** | 管理面板 | 用户管理、操作日志、系统配置 (3 页面) |
| | 认证 | 飞书 OAuth + AuthDebug 调试开关 |
| | 部署 | Docker Compose (Nginx + App + PostgreSQL) |
| **工具框架** | 工具市场 | Redux enabledTools + Sidebar checkbox toggle |
| | ShellPanel 组件 | 独立终端组件，支持 type='adb'\|'local' |
| **文档** | 清理 | README-WEB/DEPLOY/交接文档/过期 specs 已删除 |
| | AGENTS.md | 284→93 行精简 |
| **测试** | | 103 前端 + 89 后端 全通过 |
| **打包** | | `npmRebuild: false` 跳过 node-pty，exe 生成正常 |

### 已知缺口 ⚠️

| 问题 | 影响 | 根因 |
|------|------|------|
| **内存分析 Electron 不可用** | 点击内存分析无数据 | `fetchWithAuth` 调服务器 API，Electron 无后端 |
| **管理后台 API 未接通** | 页面显示"暂无数据" | 前端页面已搭建，后端 API stub |
| **Terminal 中文输入偶有问题** | 特定场景下中文异常 | ConPTY + xterm.js IME 兼容性 |
| **无自动更新** | 需手动下载新版 | 未集成 electron-updater |

---

## 二、后续规划

### 🔴 Phase 1 — 基础修复（近期）

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P0 | 内存分析 Electron 化 | `MemoryAnalysis` 通过 IPC 调用 `electron/main.cjs` 执行 ADB 命令，替代 `fetchWithAuth` |
| P0 | 管理后台 API 接通 | 接入 `server/routes/user.ts`、`server/routes/logs.ts`，页面从数据库加载数据 |
| P1 | IPC 错误处理 | 各 IPC handler 添加 try-catch，前端捕获并展示友好提示 |
| P1 | 工具市场持久化 | `localStorage` 保存 enabledTools，重启后恢复 |

### 🟡 Phase 2 — 功能完善（中期）

| 优先级 | 任务 | 方案 |
|--------|------|------|
| P2 | 用户反馈模块 | 新增反馈表单页面 + `server/routes/feedback.ts`，数据存 PostgreSQL |
| P2 | 设备详情增强 | 显示设备属性（品牌、Android 版本、分辨率等） |
| P2 | 新增工具 | 截图工具、logcat 查看器、文件浏览器（按需添加） |
| P2 | Electron 自动更新 | 集成 `electron-updater`，发布到 GitHub Releases |

### 🟢 Phase 3 — 扩展优化（远期）

| 优先级 | 任务 | 说明 |
|--------|------|------|
| P3 | macOS 适配 | 当前仅 Windows，扩展平台覆盖 |
| P3 | CI/CD 构建流水线 | GitHub Actions 自动构建 + 发布 exe |
| P3 | 工具插件系统 | 第三方可开发工具模块，动态加载 |
| P3 | 终端性能优化 | 减少输入延迟，优化大数据量渲染 |

---

## 三、架构决策

| # | 决策 | 原因 |
|---|------|------|
| 1 | Electron 主力 + Web 管理 | 用户需要本机 ADB，浏览器沙箱无法访问 |
| 2 | IPC 通信替代 HTTP | Electron 不需要后端 server，性能更好 |
| 3 | ShellPanel 独立组件 | 复用同一个终端实现 ADB Shell 和本地 cmd |
| 4 | 工具市场 Redux 驱动 | 集中管理工具启用状态，方便扩展 |
| 5 | npmRebuild: false | node-pty 仅 Web 管理后台需要，Electron 无需 |

---

## 四、技术栈

| 层 | 技术 |
|----|------|
| 桌面框架 | Electron 43 |
| 前端 | React 19 + TypeScript + Vite 8 + Tailwind CSS 4 |
| 状态管理 | Redux Toolkit |
| 终端 | xterm.js + child_process.spawn |
| 后端 | Express + PostgreSQL 16 |
| 部署 | Docker Compose (Alpine) |
| 测试 | Vitest + React Testing Library |
| 代码检查 | oxlint |
