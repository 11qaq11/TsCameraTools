# Ttyd API Contract

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07

## API Endpoints

### POST /api/ttyd/start

启动 ttyd 终端会话

**Request**:
```json
{
  "serial": "string"  // 设备序列号
}
```

**Response (200)**:
```json
{
  "success": true,
  "sessionId": "uuid",
  "port": 7681,
  "url": "http://localhost:7681"
}
```

**Response (500)**:
```json
{
  "success": false,
  "error": "ttyd binary not found" | "Failed to start ttyd" | "No available port"
}
```

### POST /api/ttyd/stop

停止 ttyd 终端会话

**Request**:
```json
{
  "sessionId": "string"
}
```

**Response (200)**:
```json
{
  "success": true
}
```

### GET /api/ttyd/status/:sessionId

查询 ttyd 会话状态

**Response (200)**:
```json
{
  "sessionId": "uuid",
  "serial": "string",
  "port": 7681,
  "status": "starting" | "running" | "stopped"
}
```

### GET /api/ttyd/check

检测 ttyd 二进制是否可用

**Response (200)**:
```json
{
  "available": true,
  "version": "1.7.7",
  "path": "bin/ttyd/ttyd.exe"
}
```

## Internal: Ttyd Process Management

### 启动流程

```
1. 检查 ttyd 二进制是否存在（bin/ttyd/ttyd.exe）
2. 查找可用端口（从 TTYD_PORT_START 开始递增）
3. spawn ttyd 进程：
   bin/ttyd/ttyd.exe -p {port} -c {credential} -t fontSize=14 -t theme={themeJson} adb -s {serial} shell
4. HTTP GET http://127.0.0.1:{port}/ 每 100ms 轮询，最多 5 秒
   - 返回 200 → 就绪，记录日志，返回 sessionId + port
   - 超时未就绪 → kill 进程，返回错误
5. 记录日志：logger.info('Ttyd', 'Session started: {sessionId} on port {port}')
```

### ttyd 主题配置

启动参数 `-t theme={themeJson}`，JSON 内容对应 Light 主题 token：

```json
{
  "background": "#FFFFFF",
  "foreground": "#0F172A",
  "cursor": "#2563EB",
  "cursorAccent": "#FFFFFF",
  "selectionBackground": "rgba(37, 99, 235, 0.2)",
  "black": "#0F172A",
  "red": "#DC2626",
  "green": "#16A34A",
  "yellow": "#CA8A04",
  "blue": "#2563EB",
  "magenta": "#9333EA",
  "cyan": "#0891B2",
  "white": "#F8FAFC",
  "brightBlack": "#64748B",
  "brightRed": "#EF4444",
  "brightGreen": "#22C55E",
  "brightYellow": "#EAB308",
  "brightBlue": "#3B82F6",
  "brightMagenta": "#A855F7",
  "brightCyan": "#06B6D4",
  "brightWhite": "#FFFFFF"
}
```

JSON 需序列化为单行字符串传递：`-t theme='{"background":"#FFFFFF",...}'`

### 停止流程

```
1. 查找 sessionId 对应的 ttyd 进程
2. 发送 SIGTERM（Windows: process.kill()）
3. 等待进程退出（最多 3 秒，超时强制 kill）
4. 记录日志：logger.info('Ttyd', 'Session stopped: {sessionId}')
5. 清理会话记录
```

### 端口管理

- 起始端口：`TTYD_PORT_START`（默认 7681）
- 最大端口：`TTYD_PORT_END`（默认 7690，最多 10 个并发会话）
- 端口冲突检测：net.createServer 尝试绑定

### 安全配置

- 认证凭证：`TTYD_CREDENTIAL` 环境变量，格式 `username:password`
- 启动参数：`-c {credential}` 传递给 ttyd
- 网络限制：仅监听 `127.0.0.1`（默认），不暴露到外网

## WebSocket Events（保留，用于非终端功能）

现有的 Socket.io 事件保留用于设备管理等非终端功能，终端交互完全由 ttyd 的 WebSocket 处理。

```
shell:start    - DEPRECATED（由 ttyd 替代）
shell:input    - DEPRECATED（由 ttyd 替代）
shell:output   - DEPRECATED（由 ttyd 替代）
shell:exit     - DEPRECATED（由 ttyd 替代）
shell:resize   - DEPRECATED（由 ttyd 替代）
```
