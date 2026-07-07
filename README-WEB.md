# TsCameraTools Web 版

基于 Web 的影像开发工具箱，支持飞书企业账号登录。

## 功能特性

- 🔐 飞书企业账号 OAuth 登录（中科创达）
- 📱 ADB 设备检测和管理
- 💻 Web 终端（Hyper 风格，基于 xterm.js + WebSocket）
- 🎨 Light 主题设计
- 📜 命令历史记录（本地存储）
- 🔍 Ctrl+R 历史搜索

## 当前状态

### 已完成功能
- ✅ 飞书 OAuth 登录流程
- ✅ ADB 设备检测（自动检测 + 手动刷新）
- ✅ 设备卡片（Root/Remount/Connect）
- ✅ Hyper 风格 Shell 终端
- ✅ 命令历史持久化
- ✅ Ctrl+R 反向搜索
- ✅ 终端快捷键（Ctrl+C/V/A/E/U/K/W/L）
- ✅ Light 主题 UI
- ✅ 操作日志面板
- ✅ Redux Store（参考 Hyper 架构）
- ✅ 错误边界（防止白屏）

### 已知问题
- ⚠️ Shell 终端使用本地回显模式（child_process.spawn pipe 模式）
- ⚠️ 中文输入法支持（IME composition 事件处理）
- ⚠️ WebSocket 连接在后端启动前有短暂报错（不影响功能）

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置飞书 OAuth 和 ADB 路径：

```env
# 飞书 OAuth 配置
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_REDIRECT_URI=http://localhost:3000/auth/feishu/callback

# ADB 配置（Windows 需要完整路径）
ADB_PATH=C:\tools\platform-tools\adb.exe
```

### 3. 启动开发服务器

```bash
# 同时启动前端和后端
npm run web:dev

# 或者分别启动
npm run dev        # 前端 (端口 5173)
npm run server:dev # 后端 (端口 3000)
```

### 4. 访问应用

打开浏览器访问：`http://localhost:5173`

## 飞书 OAuth 配置

1. 登录飞书开放平台：https://open.feishu.cn
2. 创建企业自建应用
3. 获取 App ID 和 App Secret
4. 配置重定向 URL：`http://localhost:3000/auth/feishu/callback`
5. 开启「网页应用」能力
6. 添加权限：`contact:user.id:read`、`contact:user.base:read`、`contact:user.email:read`

## 项目结构

```
TsCameraTools/
├── server/                 # 后端服务器
│   ├── index.ts           # 服务器入口
│   ├── config.ts          # 配置文件
│   ├── routes/
│   │   ├── auth.ts        # 认证路由
│   │   ├── adb.ts         # ADB API
│   │   └── logs.ts        # 日志接收
│   ├── services/
│   │   └── shell.ts       # 终端会话服务
│   └── types/
│       └── index.ts       # 类型定义
├── src/
│   ├── pages/
│   │   ├── Login.tsx      # 登录页
│   │   ├── AuthCallback.tsx # OAuth 回调
│   │   └── DevicesWeb.tsx # 设备管理页
│   ├── components/
│   │   ├── Header.tsx     # 顶部栏
│   │   ├── Sidebar.tsx    # 侧边栏
│   │   ├── LogViewer.tsx  # 操作日志面板
│   │   ├── ErrorBoundary.tsx # 错误边界
│   │   └── terminal/      # Hyper 风格终端
│   ├── hooks/
│   │   ├── useAuth.ts     # 认证 Hook
│   │   └── useSocket.ts   # WebSocket Hook
│   ├── store/             # Redux Store
│   └── utils/
│       ├── auth.ts        # 认证工具
│       └── logger.ts      # 日志工具
├── certs/                  # SSL 证书（开发环境）
└── .env                    # 环境变量
```

## API 接口

### 认证 API

- `GET /auth/feishu/login` - 获取飞书登录链接
- `GET /auth/feishu/callback` - 飞书 OAuth 回调
- `GET /auth/me` - 获取当前用户信息
- `POST /auth/logout` - 登出

### ADB API

- `GET /api/adb/check` - 检测 ADB 可用性
- `GET /api/adb/devices` - 获取设备列表
- `POST /api/adb/root/:serial` - 执行 Root
- `POST /api/adb/remount/:serial` - 执行 Remount

### WebSocket Events

- `shell:start` - 启动终端会话
- `shell:started` - 会话启动成功
- `shell:input` - 终端输入
- `shell:output` - 终端输出
- `shell:exit` - 会话结束

## 终端快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+C` | 复制选中文本 / 中断命令 |
| `Ctrl+V` | 粘贴 |
| `Ctrl+A` | 跳转到行首 |
| `Ctrl+E` | 跳转到行尾 |
| `Ctrl+U` | 删除到行首 |
| `Ctrl+K` | 删除到行尾 |
| `Ctrl+W` | 删除前一个单词 |
| `Ctrl+L` | 清屏 |
| `Ctrl+R` | 反向搜索历史 |
| `↑/↓` | 浏览命令历史 |

## 部署

### 生产环境

1. 配置正式 SSL 证书
2. 设置环境变量
3. 构建并启动：

```bash
npm run web:build
npm run web:start
```

## 许可证

MIT License
