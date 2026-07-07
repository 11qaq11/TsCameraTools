# TsCameraTools

影像开发工具箱 IDE，支持 Web 和 Electron 两种运行模式。

## 功能特性

- ADB 设备检测/安装/连接
- 交互式 Shell 终端（xterm.js）
- 飞书 OAuth 登录
- 命令历史记录（最多 300 条）
- 中文输入支持
- 历史命令搜索（Ctrl+R）

## 快速开始

### Web 模式（推荐）

```bash
npm install
npm run web:dev        # 开发模式（前端 + 后端）
npm run web:build      # 生产构建
npm run web:start      # 启动生产服务器
```

### Electron 模式

```bash
npm install
npm run electron:dev   # 开发模式
npm run electron:build # 打包 Windows exe
```

打包产物：`release/win-unpacked/TsCameraTools.exe`

## 项目结构

```
TsCameraTools/
├── electron/              # Electron 主进程
│   ├── main.cjs           # 主进程（IPC handlers, ADB 逻辑）
│   └── preload.cjs        # 预加载脚本（暴露 electronAPI）
├── server/                # Web 模式后端
│   ├── index.ts           # 服务器入口
│   ├── config.ts          # 配置文件
│   ├── routes/            # API 路由
│   │   ├── auth.ts        # 飞书 OAuth
│   │   ├── adb.ts         # ADB API
│   │   └── logs.ts        # 日志 API
│   ├── services/          # 业务服务
│   │   └── shell.ts       # Shell 终端服务
│   └── types/             # 类型定义
├── src/                   # 前端源码
│   ├── components/        # UI 组件
│   │   └── terminal/      # 终端组件
│   ├── hooks/             # 自定义 Hooks
│   ├── layouts/           # 布局组件
│   ├── pages/             # 页面组件
│   ├── store/             # Redux 状态管理
│   ├── utils/             # 工具函数
│   ├── types/             # 类型定义
│   └── config/            # 配置文件
├── specs/                 # 功能规格文档
├── scripts/               # 脚本工具
├── certs/                 # SSL 证书
└── AGENTS.md              # 开发准则
```

## 命令参考

| 命令 | 说明 |
|------|------|
| `npm run dev` | Vite 开发服务器 |
| `npm run build` | TypeScript 编译 + Vite 构建 |
| `npm run lint` | 代码检查 (oxlint) |
| `npm run web:dev` | Web 开发模式 |
| `npm run web:build` | Web 生产构建 |
| `npm run web:start` | 启动生产服务器 |
| `npm run server:dev` | 后端开发模式 |
| `npm run server:build` | 后端编译 |
| `npm run server:start` | 启动生产后端 |
| `npm run electron:dev` | Electron 开发模式 |
| `npm run electron:build` | Electron 打包 |
| `npm run electron:pack` | Electron 打包（目录） |

## 技术栈

### 前端
- React 19 + TypeScript
- Vite 8 + Tailwind CSS 4
- Redux Toolkit（状态管理）
- React Router v7（路由）
- xterm.js（终端模拟）
- lucide-react（图标）
- Socket.io Client（WebSocket）

### 后端
- Express.js
- Socket.io（WebSocket）
- 飞书 OAuth 2.0

### 桌面端
- Electron 43
- contextBridge（安全 IPC）

## 环境变量

复制 `.env.example` 为 `.env`，配置以下变量：

```env
# 飞书 OAuth
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret

# ADB 路径（可选）
ADB_PATH=/path/to/adb
```

## 开发规范

详见 [AGENTS.md](./AGENTS.md)

## Git 工作流

### 分支命名

| 前缀 | 用途 |
|------|------|
| `feature/` | 新功能 |
| `fix/` | 修复 bug |
| `refactor/` | 重构 |
| `docs/` | 文档变更 |

### Commit 格式

```
type: description
```

类型：`feat`, `fix`, `refactor`, `docs`, `test`, `chore`

### 注意事项

- 禁止直接向 master 推送代码
- 禁止对 master 强制推送
- PR 合并前确保 `npm run build` 通过

## 许可证

私有项目
