# TsCameraTools - Agent 指南

## 项目概述

小米影像开发工程师**桌面集成工具箱**。

- **Electron 桌面端**（主力）：Windows，ADB + Shell + 内存分析
- **Web 管理后台**（辅助）：服务器部署，仅管理员

## 关键命令

```bash
npm run electron:dev     # Electron 开发 (vite + electron)
npm run web:dev          # Web 开发 (vite 5173 + server 3000)
npm run web:build        # 必须先通过此构建才能提交
npm run electron:build   # 打包 .exe (tsc + vite + electron-builder)
npm run test             # 前端测试 (vitest, jsdom)
npm run test:server      # 后端测试 (vitest, node)
npm run lint             # oxlint  (不是 eslint)
```

**构建失败**: 杀进程 → 等 3 秒 → 重试，最多 3 次。

## 架构

```
electron/main.cjs       → IPC handlers + spawn (CommonJS, ESM 不兼容)
electron/preload.cjs    → 暴露 electronAPI
src/types/index.ts      → ElectronAPI 类型
src/components/terminal/ShellPanel.tsx → xterm.js + IPC 终端组件
src/pages/Devices.tsx   → Electron 设备管理页
src/pages/admin/        → Web 管理后台页
src/layouts/MainLayout.tsx → 检测 electronAPI 分流 Electron/Web
server/                 → Express 后端 (管理后台 API)
src/store/reducers/ui.ts → Redux: enabledTools/toggleTool 工具市场
```

## 双模式关键差异

| | Electron | Web (Admin) |
|---|---|---|
| ADB | `child_process.spawn` 本机 | `exec()` 服务器 |
| 终端 | `ShellPanel` (IPC + spawn) | `server/services/terminal.ts` (node-pty + WS) |
| 登录 | 自动跳过 (客户端本地) | 飞书 OAuth / AuthDebug |
| 入口路由 | `/` → `Devices.tsx` | `/` → `DevicesWeb.tsx` |
| 侧边栏 | 工具导航 + 工具市场 | admin 导航 |

## TypeScript

项目引用：`tsconfig.json` → `tsconfig.app.json` + `tsconfig.node.json` + `tsconfig.server.json` (server 独立编译)

## Shell 终端 (Electron)

- `ShellPanel` 支持 `type='adb'|'local'`
- ADB: IPC `adb:shell:start/write/kill/data/exit`
- 本地: IPC `local:shell:start/write/kill/data/exit` → `cmd.exe`
- 中文输入、命令历史 (持久化 JSON)、Ctrl+R 搜索

## UI

- **Tailwind CSS v4**: `@theme` 在 `src/index.css`，**无** `tailwind.config.js`
- 中文界面

## AuthDebug

`.env` 设 `AUTH_DEBUG=true` → `server/middleware/auth.ts` 自动放行，使用调试用户。
Electron 模式下 `Login.tsx` 自动创建调试 token 跳过 OAuth。

## Docker 部署 (管理后台)

```bash
docker compose up -d --build    # Nginx + App + PostgreSQL
ssh server                       # 122.51.90.193 (ubuntu, ~/.ssh/mimo_ed25519)
```

## 新增功能

1. 新工具: 创建 `src/pages/NewTool.tsx` → `src/config/navigation.tsx` 加 navItem → 工具市场自动可见
2. 新 IPC: `electron/main.cjs` → `preload.cjs` → `src/types/index.ts`
3. 新管理页面: `src/pages/admin/NewPage.tsx` → `MainLayout.tsx` 加路由

## 核心准则

- **Ponytail**: 最少代码，复用优先
- **Karpathy**: 先 Read 再 Edit，禁止顺手改动不相关代码
- **每次修改后**: `npm run web:build` 验证

## 已知问题

- 终端中文输入偶有问题
- `node-pty` 原生模块需编译环境 (Docker Alpine 需 `libc6-compat`)
- `electron-builder` 设了 `npmRebuild: false` 跳过 node-pty 重编译
- Web 模式下 memory 分析页面仍用 `fetchWithAuth` 调后端 API (Electron 下不可用)
