# ADB Shell 中文输入问题 Debug 方案

## 1. 两种终端架构对比

### 本地终端 (cmd.exe via ttyd)
```
用户键盘 → xterm.js (iframe) → WebSocket → ttyd 进程 → cmd.exe stdin
                                                      ← cmd.exe stdout
```
- ttyd 启动命令: `ttyd -p <port> cmd.exe`
- 环境变量: `LANG=en_US.UTF-8`, `PROMPT=$P$G `
- **cmd.exe 原生支持 Unicode/IME**

### ADB Shell 终端 (adb shell via ttyd)
```
用户键盘 → xterm.js (iframe) → WebSocket → ttyd 进程 → adb stdin → Android shell
                                                                  ← Android shell stdout
                                                      ← adb stdout
```
- ttyd 启动命令: `ttyd -p <port> adb -s <serial> shell`
- 环境变量: `LANG=en_US.UTF-8` (无 PROMPT)
- **adb 是中间代理，Android shell 的编码取决于设备配置**

## 2. 中文输入导致 Reconnect 的流程

### Electron 模式流程
```
1. 用户通过 IME 输入中文
2. xterm.js textarea 触发 compositionstart → composing.current = true
3. xterm.js 处理合成文本 → 触发 onData(data) [含中文字符]
4. compositionend → requestAnimationFrame(() => composing.current = false)
5. onData handler 检查 composing.current:
   - 如果 true → 输入被丢弃 (IME 竞态)
   - 如果 false → 继续处理
6. 调用 window.electronAPI.adbShellWrite(shellId, data)
7. IPC → main.cjs → proc.stdin.write(data.replace(/\r/g, '\n'))
8. ADB 进程接收中文输入 → 转发到 Android shell
9. Android shell 处理 (可能失败) → 输出/错误
10. stdout/stderr → IPC → renderer → xterm.js 显示
```

### Web 模式 (ttyd) 流程
```
1. 用户通过 IME 输入中文
2. ttyd 内嵌的 xterm.js 处理 IME → WebSocket 发送中文数据
3. ttyd 进程接收 WebSocket 数据 → 写入 adb 进程 stdin
4. adb 进程转发到 Android shell
5. Android shell 输出 → adb stdout → ttyd → WebSocket → iframe 显示
```

### 可能的崩溃点
```
崩溃点 A: ttyd 进程崩溃 (WebSocket 1006)
  - ttyd 处理 UTF-8 输入时 bug
  - ttyd 写入 adb stdin 时异常

崩溃点 B: adb 进程退出
  - adb 不处理 stdin 中的 UTF-8
  - adb 与 Android 设备的连接断开

崩溃点 C: Android shell 崩溃
  - shell 不支持 UTF-8
  - shell locale 配置问题
  - shell 处理多字节字符时 crash

崩溃点 D: WebSocket 断开
  - ttyd 进程 crash 导致 WebSocket 1006
  - 网络超时
```

## 3. Debug 日志方案

### 3.1 后端: server/services/ttyd.ts

在 ttyd 启动时记录完整参数，在进程退出时记录退出码和信号：

```typescript
// 启动时
log.info({
  sessionId,
  serial,
  port,
  args: args.join(' '),
  env: { LANG: process.env.LANG },
}, '[ADB-DEBUG] Starting ADB shell session')

// stdout 数据 (已有)
child.stdout?.on('data', (data) => {
  const hex = Buffer.from(data).toString('hex')
  log.debug({
    sessionId,
    length: data.length,
    hex: hex.substring(0, 200),  // 前 100 字节的 hex
    text: data.toString().substring(0, 100),
  }, '[ADB-DEBUG] stdout data')
})

// stderr 数据 (已有)
child.stderr?.on('data', (data) => {
  log.error({
    sessionId,
    data: data.toString(),
  }, '[ADB-DEBUG] stderr data')
})

// 进程退出 (已有，增加详细信息)
child.on('exit', (code, signal) => {
  log.error({
    sessionId,
    pid: child.pid,
    exitCode: code,
    signal,
    uptime: Date.now() - startTime,
  }, '[ADB-DEBUG] ADB shell process EXIT')
})
```

### 3.2 前端: Electron 模式 (src/pages/Devices.tsx)

在 onData handler 中增加详细日志：

```typescript
term.onData((data) => {
  if (!sessionActive.current) return

  // DEBUG: 记录所有输入事件
  console.log('[IME-DEBUG] onData fired:', {
    data: data.substring(0, 50),
    dataHex: Array.from(data).map(c => c.charCodeAt(0).toString(16)).join(' '),
    composing: composing.current,
    dataLength: data.length,
  })

  if (composing.current) return

  // ... 处理逻辑
})
```

在 compositionstart/end 中增加日志：

```typescript
textarea.addEventListener('compositionstart', () => {
  console.log('[IME-DEBUG] compositionstart')
  composing.current = true
})

textarea.addEventListener('compositionend', (e) => {
  console.log('[IME-DEBUG] compositionend:', {
    data: e.data,
    composingBefore: composing.current,
  })
  requestAnimationFrame(() => {
    console.log('[IME-DEBUG] rAF callback: resetting composing to false')
    composing.current = false
  })
})
```

在 handleExit 中增加日志：

```typescript
const handleExit = (id: string) => {
  if (id === shellId) {
    console.error('[IME-DEBUG] Shell EXIT event received:', { id, shellId })
    sessionActive.current = false
    // ...
  }
}
```

### 3.3 前端: Web 模式 (src/components/terminal/TtydTerminal.tsx)

监控 iframe 加载和错误：

```typescript
const handleIframeLoad = useCallback(() => {
  console.log('[TTYD-DEBUG] iframe loaded:', { url: ttydUrl })
}, [ttydUrl])

const handleIframeError = useCallback(() => {
  console.error('[TTYD-DEBUG] iframe error:', { url: ttydUrl })
}, [ttydUrl])
```

### 3.4 IPC 层: electron/main.cjs

在 adb:shell:write 中增加日志：

```typescript
ipcMain.on('adb:shell:write', (_event, id, data) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    const hasChinese = /[\u4e00-\u9fff]/.test(data)
    if (hasChinese) {
      console.log(`[IME-DEBUG] Writing Chinese to shell ${id}:`, {
        data: data.substring(0, 50),
        hex: Buffer.from(data, 'utf-8').toString('hex'),
        length: data.length,
        stdinWritable: proc.stdin.writable,
        stdinDestroyed: proc.stdin.destroyed,
      })
    }
    proc.stdin.write(data.replace(/\r/g, '\n'))
  }
})
```

在进程 close 中增加详细信息：

```typescript
proc.on('close', (code, signal) => {
  console.error(`[IME-DEBUG] Shell process closed:`, {
    id,
    code,
    signal,
    pid: proc.pid,
  })
  shells.delete(id)
  // ...
})
```

## 4. 验证步骤

### Step 1: 本地终端中文输入 (基线)
1. 打开本地终端
2. 输入中文 "你好"
3. 确认正常显示
4. 检查日志: `[IME-DEBUG]` 相关日志

### Step 2: ADB Shell 中文输入 (复现)
1. 打开 ADB Shell 终端
2. 输入单个中文字 "你"
3. 观察是否触发 reconnect
4. 检查日志:
   - `[IME-DEBUG] onData fired` - 是否触发
   - `[IME-DEBUG] compositionend` - IME 是否正常结束
   - `[IME-DEBUG] Writing Chinese to shell` - 是否发送到 adb
   - `[ADB-DEBUG] stderr data` - adb 是否有错误输出
   - `[ADB-DEBUG] ADB shell process EXIT` - 进程是否退出

### Step 3: 分析日志
- 如果 `onData` 没有触发 → xterm.js IME 处理问题
- 如果 `composing` 一直为 true → rAF 竞态问题
- 如果 `Writing Chinese to shell` 没有出现 → 数据没到 IPC 层
- 如果 `stderr data` 有输出 → adb/Android shell 错误
- 如果 `process EXIT` 触发 → adb 进程崩溃

## 5. 预期根因分析

### 最可能的根因: Android shell 不支持 UTF-8

Android 设备的 shell (通常是 mksh 或 toybox) 可能没有正确配置 UTF-8 locale。当 adb 将 UTF-8 编码的中文字符写入 stdin 时：

1. adb 进程正常运行 (它是 UTF-8 兼容的)
2. Android shell 收到 UTF-8 字节
3. Shell 尝试解析但 locale 不匹配
4. Shell 可能输出错误或直接退出
5. adb 检测到子 shell 退出 → adb 进程也退出
6. ttyd 检测到 adb 进程退出 → WebSocket 关闭 (1006)
7. 前端检测到连接断开 → 显示 "Device Disconnected"

### 验证方法
```bash
# 在 Android 设备上检查 locale
adb shell locale

# 检查 LANG 环境变量
adb shell echo \$LANG

# 尝试手动输入中文
adb shell
# 然后尝试输入中文字符
```

### 其他可能根因

1. **ttyd 的 WebSocket 不支持 UTF-8**: 检查 ttyd 版本和 UTF-8 支持
2. **adb 的 stdin pipe 编码问题**: Windows pipe 可能影响编码
3. **xterm.js IME 处理 bug**: 特定版本的 xterm.js 可能有 IME 问题
