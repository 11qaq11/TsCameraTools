# Contracts: ADB Shell Bug Fixes

**Created**: 2026-07-04

## IPC Contract Changes

### 新增: `adb:shell:flush-stdin`

**方向**: Renderer → Main

**Request**:
```typescript
ipcRenderer.send('adb:shell:flush-stdin', id: string)
```

**行为**:
- 向指定 shell 进程发送 `\x03\n` 以清空 stdin 缓冲区
- 不返回值（fire-and-forget）

**Main Process Handler** (`main.cjs`):
```js
ipcMain.on('adb:shell:flush-stdin', (_event, id) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    proc.stdin.write('\x03\n')
  }
})
```

### 修改: `preload.cjs`

新增暴露方法：
```js
adbShellFlushStdin: (id) => ipcRenderer.send('adb:shell:flush-stdin', id),
```

### 修改: `types/index.ts`

新增方法签名：
```typescript
adbShellFlushStdin: (id: string) => void
```

## Frontend Contract Changes

### ShellPanel 输出格式化

**输入**: raw adb shell output string
**输出**: formatted string (每行前添加一个空格)

**处理逻辑**:
```js
const formatted = data.split('\n').map(line => ' ' + line).join('\n')
term.write(formatted)
```

### ShellPanel 复制行为

**事件**: `term.onSelectionChange`
**行为**: 当选中文本非空时，自动复制到系统剪贴板

### ShellPanel 滚动行为

**触发**: `writePrompt()` 调用后
**行为**: `term.scrollToBottom()`
