# API 文档

## 认证 API

### GET /auth/feishu/login

获取飞书 OAuth 登录链接。

**响应**
```json
{
  "url": "https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=xxx&redirect_uri=xxx"
}
```

---

### GET /auth/feishu/callback

飞书 OAuth 回调处理。

**查询参数**
- `code` - 授权码
- `state` - 状态参数

**响应**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "xxx",
    "name": "张三",
    "email": "zhangsan@example.com",
    "avatar": "https://xxx.jpg"
  }
}
```

---

### GET /auth/me

获取当前用户信息（需要认证）。

**请求头**
```
Authorization: Bearer <token>
```

**响应**
```json
{
  "id": "xxx",
  "name": "张三",
  "email": "zhangsan@example.com",
  "avatar": "https://xxx.jpg"
}
```

---

### POST /auth/logout

登出（需要认证）。

**请求头**
```
Authorization: Bearer <token>
```

**响应**
```json
{
  "success": true
}
```

---

## ADB API

### GET /api/adb/check

检测 ADB 可用性。

**响应**
```json
{
  "available": true
}
```

---

### GET /api/adb/devices

获取已连接设备列表。

**响应**
```json
{
  "devices": [
    {
      "serial": "1234567890ABCDEF",
      "model": "Pixel 6",
      "status": "device"
    }
  ]
}
```

---

### POST /api/adb/root/:serial

执行 ADB Root。

**路径参数**
- `serial` - 设备序列号

**响应**
```json
{
  "success": true,
  "message": "adbd is already running as root"
}
```

---

### POST /api/adb/remount/:serial

执行 ADB Remount。

**路径参数**
- `serial` - 设备序列号

**响应**
```json
{
  "success": true,
  "message": "remount succeeded"
}
```

---

## 日志 API

### POST /api/logs

接收前端日志。

**请求体**
```json
{
  "level": "info",
  "tag": "Devices",
  "message": "ADB check result",
  "data": { "available": true }
}
```

**响应**
```json
{
  "success": true
}
```

---

### POST /api/logs/batch

批量接收前端日志。

**请求体**
```json
{
  "logs": [
    {
      "level": "info",
      "tag": "Devices",
      "message": "ADB check result",
      "data": { "available": true }
    }
  ]
}
```

**响应**
```json
{
  "success": true
}
```

---

### GET /api/logs/files

获取日志文件列表。

**响应**
```json
{
  "files": [
    {
      "name": "2026-07-07.log",
      "size": 1234,
      "modified": "2026-07-07T12:00:00Z"
    }
  ]
}
```

---

## WebSocket Events

### shell:start

启动终端会话（客户端 → 服务端）。

**数据**
```json
{
  "serial": "1234567890ABCDEF"
}
```

---

### shell:started

会话启动成功（服务端 → 客户端）。

**数据**
```json
{
  "sessionId": "xxx",
  "serial": "1234567890ABCDEF"
}
```

---

### shell:input

终端输入（客户端 → 服务端）。

**数据**
```json
{
  "sessionId": "xxx",
  "input": "ls -la\n"
}
```

---

### shell:output

终端输出（服务端 → 客户端）。

**数据**
```json
{
  "sessionId": "xxx",
  "data": "total 12\ndrwxr-xr-x  3 root root 4096 Jul  7 12:00 .\n"
}
```

---

### shell:exit

会话结束（服务端 → 客户端）。

**数据**
```json
{
  "sessionId": "xxx",
  "code": 0
}
```

---

### shell:error

会话错误（服务端 → 客户端）。

**数据**
```json
{
  "sessionId": "xxx",
  "error": "ADB not found"
}
```

---

## Electron IPC API

### adb:check

检测 ADB 可用性。

**调用**
```typescript
window.electronAPI.adbCheck(): Promise<{ available: boolean }>
```

---

### adb:install

安装 ADB。

**调用**
```typescript
window.electronAPI.adbInstall(): Promise<{ success: boolean; message: string }>
```

---

### adb:devices

获取设备列表。

**调用**
```typescript
window.electronAPI.adbDevices(): Promise<AdbDevice[]>
```

---

### adb:root

执行 ADB Root。

**调用**
```typescript
window.electronAPI.adbRoot(serial: string): Promise<{ success: boolean; message: string }>
```

---

### adb:remount

执行 ADB Remount。

**调用**
```typescript
window.electronAPI.adbRemount(serial: string): Promise<{ success: boolean; message: string }>
```

---

### adb:shell:start

启动 Shell 会话。

**调用**
```typescript
window.electronAPI.adbShellStart(serial: string): Promise<string | null>
```

---

### adb:shell:write

写入 Shell 输入。

**调用**
```typescript
window.electronAPI.adbShellWrite(id: string, data: string): void
```

---

### adb:shell:kill

终止 Shell 会话。

**调用**
```typescript
window.electronAPI.adbShellKill(id: string): void
```

---

### adb:shell:flush-stdin

清空 Shell stdin。

**调用**
```typescript
window.electronAPI.adbShellFlushStdin(id: string): void
```

---

### onShellData

监听 Shell 输出。

**调用**
```typescript
window.electronAPI.onShellData(callback: (id: string, data: string) => void): void
```

---

### onShellExit

监听 Shell 退出。

**调用**
```typescript
window.electronAPI.onShellExit(callback: (id: string) => void): void
```

---

### loadHistory

加载命令历史。

**调用**
```typescript
window.electronAPI.loadHistory(): Promise<{ success: boolean; history: string[] }>
```

---

### saveHistory

保存命令历史。

**调用**
```typescript
window.electronAPI.saveHistory(history: string[]): Promise<{ success: boolean }>
```
