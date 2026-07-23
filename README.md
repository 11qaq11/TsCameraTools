# TsCameraTools

小米影像开发工程师桌面集成工具箱。

- **Electron 桌面端**（主力）：ADB 设备管理、Shell 终端、内存分析
- **Web 管理后台**（辅助）：用户管理、操作日志、系统配置（仅管理员）

## 快速开始

```bash
npm install
npm run electron:dev    # Electron 开发
npm run web:dev         # Web 管理后台开发
```

## 构建

```bash
npm run web:build       # tsc + vite + server → dist/
npm run electron:build  # tsc + vite + electron-builder → release/*.exe
npm run test:all        # 103 + 89 tests
npm run lint            # oxlint
```

## 核心架构

```
electron/main.cjs      → IPC + child_process.spawn (ADB Shell / 本地终端)
electron/preload.cjs   → 暴露 electronAPI 到渲染进程
src/pages/Devices.tsx  → 设备管理 (Electron)
src/pages/admin/       → 管理后台页面 (Web)
server/                → Express 后端 (管理后台 API)
```

## 环境变量

`.env.example` → `.env`:
```env
AUTH_DEBUG=true        # 跳过飞书 OAuth (开发用)
FEISHU_APP_ID / FEISHU_APP_SECRET
DATABASE_URL           # PostgreSQL 连接
```

## 开发准则

[AGENTS.md](./AGENTS.md)
