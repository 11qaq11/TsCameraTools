# Web 端界面架构设计

**Created**: 2026-07-06
**Status**: In Progress

## 1. 系统架构

```
┌─────────────────────────────────────────────────────────────────────┐
│                         浏览器 (Chrome/Firefox/Safari)               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  React + TypeScript + Tailwind CSS                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │  │  Login      │  │  Devices    │  │  Terminal           │ │   │
│  │  │  (飞书OAuth) │  │  (设备列表)  │  │  (xterm.js + WS)   │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTPS + WSS
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Node.js 服务器                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Express + Socket.io                                        │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │  │  Auth API   │  │  ADB API    │  │  WebSocket Server   │ │   │
│  │  │  (飞书OAuth) │  │  (设备管理)  │  │  (终端会话)         │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                    │                               │
│                                    ▼                               │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  ADB Service Layer                                          │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │   │
│  │  │  Device     │  │  Shell      │  │  Command            │ │   │
│  │  │  Manager    │  │  Manager    │  │  Executor           │ │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         ADB 进程 (child_process)                    │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. 技术栈

### 前端
- **框架**: React 19 + TypeScript
- **样式**: Tailwind CSS 4
- **终端**: xterm.js + @xterm/addon-fit
- **WebSocket**: socket.io-client
- **路由**: react-router-dom
- **图标**: lucide-react

### 后端
- **服务器**: Express.js
- **WebSocket**: Socket.io
- **认证**: 飞书 OAuth 2.0
- **HTTPS**: 自签名证书或 Let's Encrypt
- **ADB**: child_process.spawn

## 3. API 接口设计

### 3.1 认证 API

```
GET  /auth/feishu/login     - 获取飞书登录链接
GET  /auth/feishu/callback  - 飞书 OAuth 回调
POST /auth/logout           - 登出
GET  /auth/me               - 获取当前用户信息
```

### 3.2 ADB API

```
GET  /api/adb/check         - 检测 ADB 可用性
GET  /api/adb/devices       - 获取设备列表
POST /api/adb/root/:serial  - 执行 Root
POST /api/adb/remount/:serial - 执行 Remount
```

### 3.3 WebSocket Events

```
shell:start    - 启动终端会话 (client -> server)
shell:input    - 终端输入 (client -> server)
shell:output   - 终端输出 (server -> client)
shell:exit     - 会话结束 (server -> client)
shell:resize   - 终端大小调整 (client -> server)
```

## 4. 数据模型

### 用户信息
```typescript
interface User {
  id: string           // 飞书用户 ID
  name: string         // 用户名
  email: string        // 邮箱
  avatar: string       // 头像 URL
  tenantKey: string    // 租户 key
}
```

### 设备信息
```typescript
interface AdbDevice {
  serial: string       // 设备序列号
  model: string        // 设备型号
  status: 'device' | 'offline' | 'unauthorized'
}
```

### 会话信息
```typescript
interface ShellSession {
  id: string           // 会话 ID
  serial: string       // 设备序列号
  userId: string       // 用户 ID
  startTime: number    // 开始时间
}
```

## 5. 安全设计

### 5.1 认证流程
1. 用户访问页面，未登录则跳转到登录页
2. 点击"飞书登录"，跳转到飞书授权页面
3. 用户授权后，飞书回调到后端 `/auth/feishu/callback`
4. 后端获取用户信息，创建 session/token
5. 返回前端，存储 token 到 localStorage

### 5.2 HTTPS 配置
- 开发环境: 自签名证书
- 生产环境: Let's Encrypt 或企业证书

### 5.3 CORS 配置
- 仅允许前端域名访问
- 配置 credentials: true

## 6. 目录结构

```
TsCameraTools/
├── server/
│   ├── index.ts              # 服务器入口
│   ├── config.ts             # 配置文件
│   ├── middleware/
│   │   ├── auth.ts           # 认证中间件
│   │   └── cors.ts           # CORS 配置
│   ├── routes/
│   │   ├── auth.ts           # 认证路由
│   │   └── adb.ts            # ADB 路由
│   ├── services/
│   │   ├── feishu.ts         # 飞书 OAuth 服务
│   │   ├── adb.ts            # ADB 服务
│   │   └── shell.ts          # 终端会话服务
│   └── types/
│       └── index.ts          # 类型定义
├── src/
│   ├── pages/
│   │   ├── Login.tsx         # 登录页
│   │   └── Devices.tsx       # 设备管理页
│   ├── components/
│   │   ├── Terminal.tsx      # 终端组件
│   │   ├── DeviceCard.tsx    # 设备卡片
│   │   └── UserMenu.tsx      # 用户菜单
│   ├── hooks/
│   │   ├── useAuth.ts        # 认证 Hook
│   │   └── useSocket.ts      # WebSocket Hook
│   ├── utils/
│   │   ├── api.ts            # API 客户端
│   │   └── auth.ts           # 认证工具
│   └── types/
│       └── index.ts          # 前端类型定义
├── certs/                    # SSL 证书目录
│   ├── cert.pem
│   └── key.pem
└── package.json
```

## 7. 环境变量

```env
# 服务器
PORT=3000
HTTPS=true

# 飞书 OAuth
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
FEISHU_REDIRECT_URI=https://your-domain/auth/feishu/callback

# ADB
ADB_PATH=/path/to/adb
```
