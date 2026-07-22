# TsCameraTools - Agent 指南

## 项目概述

影像开发工具箱 IDE，双模式运行：
- **Web 模式**（推荐）：Express + Socket.io 后端 + React 前端
- **Electron 模式**：桌面应用

核心功能：ADB 设备管理、交互式 Shell 终端、飞书 OAuth 登录

---

## 关键命令

```bash
# 开发
npm run web:dev        # 前端(5173) + 后端(3000) 并行启动
npm run electron:dev   # Vite + Electron 并行

# 构建（必须通过才能提交）
npm run web:build      # tsc -b && vite build && tsc -p tsconfig.server.json
npm run electron:build # tsc -b && vite build && electron-builder --win

# 测试
npm run test           # 前端测试 (vitest)
npm run test:server    # 后端测试 (vitest --config vitest.server.config.ts)
npm run test:all       # 全部测试

# 代码检查
npm run lint           # oxlint（非 eslint）
```

**构建失败处理**：杀进程 → 等 3 秒 → 重试，最多 3 次

---

## 架构要点

### 路径与编码
- **路径别名**：`@` → `./src`（vite.config.ts）
- **文件编码**：UTF-8
- **路由**：HashRouter，格式 `/#/path`

### 双模式架构
```
electron/main.cjs      → IPC handlers（CommonJS，ESM 不兼容）
electron/preload.cjs   → 暴露 electronAPI
src/types/index.ts     → ElectronAPI 类型定义
```

### 后端（server/）
- 入口：`server/index.ts`
- 配置：`server/config.ts`（读取 .env）
- 路由：`server/routes/{auth,adb,logs,ttyd,debug,user}.ts`
- 数据库：`server/db/`（PostgreSQL 连接池 + 迁移）
- 认证中间件：`server/middleware/auth.ts`
- 终端服务：`server/services/terminal.ts`（node-pty + WebSocket）
- 日志：pino → `logs/server.log`

### 前端关键目录
```
src/store/             → Redux Toolkit（ui.ts, sessions.ts）
src/components/terminal/ → XtermTerminal.tsx（xterm.js + WebSocket）
src/hooks/             → useAuth, useSearch
src/pages/             → Devices, DevicesWeb, Login, AuthCallback, LocalTerminal
```

### Shell 终端（统一架构 2026-07-15）
- 后端：`server/services/terminal.ts` — node-pty + WebSocket（`/terminal` 路径）
- 前端：`src/components/terminal/XtermTerminal.tsx` — xterm.js + FitAddon + WebSocket
- 协议：JSON `{type:'input'|'output'|'resize'|'kill'|'ready'|'exit'}`
- 通信：WebSocket（Web 模式）/ Electron IPC（Electron 模式 Devices.tsx 仍用旧方式）
- 本地终端：powershell.exe（Windows）/ bash（Linux）

---

## TypeScript 配置

项目使用项目引用（Project References）：
- `tsconfig.json` → 引用 `tsconfig.app.json` + `tsconfig.node.json`
- `tsconfig.app.json`：前端（src/）
- `tsconfig.node.json`：Node/Vite（vite.config.ts）
- `tsconfig.server.json`：后端（server/）

构建时 `tsc -b` 编译前端，`tsc -p tsconfig.server.json` 编译后端

---

## 测试配置

### 前端测试（vitest.config.ts）
- 环境：jsdom
- 入口：`src/**/*.{test,spec}.{ts,tsx}`
- Setup：`src/test/setup.ts`
- 覆盖率阈值：80%（branches/functions/lines/statements）

### 后端测试（vitest.server.config.ts）
- 环境：node
- 入口：`server/**/*.{test,spec}.{ts,tsx}`

### 测试工具
- `src/test/test-utils.tsx`：React 测试工具
- `src/test/mock-utils.ts`：Mock 工具

---

## UI 框架

- **Tailwind CSS v4**：主题通过 `@theme` 定义在 `src/index.css`，**无** `tailwind.config.js`
- **Linter**：oxlint（配置 `.oxlintrc.json`），非 eslint
- **UI 语言**：中文

---

## 环境变量

复制 `.env.example` → `.env`：
```env
FEISHU_APP_ID / FEISHU_APP_SECRET  # 飞书 OAuth
ADB_PATH                           # ADB 路径（Windows 需完整路径）
TTYD_PORT_START/END                # 终端端口范围
TTYD_CREDENTIAL                    # 终端认证
DATABASE_URL                       # PostgreSQL 连接字符串
DB_PASSWORD                        # 数据库密码
SESSION_EXPIRY_HOURS               # 会话过期时间（小时）
```

---

## Docker 部署

```bash
# 构建并启动（app + PostgreSQL + Nginx）
docker-compose build
docker-compose up -d

# 查看日志
docker-compose logs -f app

# 停止服务
docker-compose down
```

详细部署文档见 `DEPLOY.md`。

---

## 新增功能模式

### 新增页面
1. 创建 `src/pages/NewPage.tsx`
2. `src/App.tsx` 添加 `<Route>`
3. `src/components/Sidebar.tsx` 的 `navItems` 添加导航项

### 新增 IPC 能力
1. `electron/main.cjs`：`ipcMain.handle('channel:name', handler)`
2. `electron/preload.cjs`：暴露方法到 `electronAPI`
3. `src/types/index.ts`：`ElectronAPI` 接口添加类型

---

## Spec-Driven 开发

项目使用 `.specify/` 和 `specs/` 进行规格驱动开发：
- `.specify/memory/`：项目约定、决策记录
- `specs/XXX-*/`：功能规格（spec.md, plan.md, tasks.md）

---

## Git 工作流

- **分支保护**：master 禁止直接推送，必须 PR 合并
- **分支命名**：`feature/`, `fix/`, `refactor/`, `docs/`
- **Commit 格式**：`type: description`（feat/fix/refactor/docs/test/chore）
- **PR 前置条件**：`npm run web:build` 通过

---

## 核心准则

### 1. Ponytail（懒惰开发者）
- 最少代码解决问题，无未请求的抽象
- Bug 修复找根因，修复共享函数一次
- 标记简化：`ponytail:` 注释说明上限和升级路径

### 2. Karpathy Guidelines
- 修改前先 Read 理解上下文
- 用 Edit 精确替换，非 Write 整文件覆盖
- 禁止顺手改动不相关代码
- 每个变更行必须能追溯到用户请求

### 3. 自审（必须执行）
完成后对所有修改代码执行 ponytail-review：
- 格式：`<file>:L<line>: <tag> <what>. <replacement>.`
- Tags：`delete:` / `stdlib:` / `native:` / `yagni:` / `shrink:`

### 4. 编译验证（必须执行）
每次修改后运行 `npm run web:build` 或 `npm run electron:build`

---

## 已知问题

- 终端连接失败：检查 `bin/ttyd/ttyd.exe` 和端口 7681-7690
- WebSocket 后端未启动时报错（不影响功能）
- 中文输入依赖 ttyd 原生 IME 处理
