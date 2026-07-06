# Plan: ADB Shell Bug Fixes

**Created**: 2026-07-04
**Status**: Ready

## Overview

修复 ADB Shell 终端的 4 个 bug，所有改动集中在 `src/pages/Devices.tsx` 和 `electron/main.cjs`。

## Technical Context

- **前端**: React + xterm.js 5.x + @xterm/addon-fit
- **后端**: Electron main process (CommonJS)
- **IPC**: contextBridge + ipcMain/ipcRenderer
- **布局**: MainLayout (flex) → Devices (flex-col) → ShellPanel (flex-col flex-1 min-h-0)

## Implementation Steps

### Step 1: BUG-001 — 输出格式化

**文件**: `src/pages/Devices.tsx`
**位置**: `handleData` 函数 (L419-425)

**改动**:
```js
// Before
const handleData = (id: string, data: string) => {
  if (id === shellId) {
    if (promptTimer) clearTimeout(promptTimer)
    term.write(data)
    promptTimer = setTimeout(writePrompt, 30)
  }
}

// After
const handleData = (id: string, data: string) => {
  if (id === shellId) {
    if (promptTimer) clearTimeout(promptTimer)
    const formatted = data.split('\n').map(line => ' ' + line).join('\n')
    term.write(formatted)
    promptTimer = setTimeout(writePrompt, 30)
  }
}
```

**verify**: 执行 `ls` 命令，输出每行前有空格

---

### Step 2: BUG-002 — Ctrl+C 清空 stdin

**文件**: `electron/main.cjs`
**位置**: 新增 IPC handler（在 `adb:shell:kill` 之后）

**改动**:
```js
ipcMain.on('adb:shell:flush-stdin', (_event, id) => {
  const proc = shells.get(id)
  if (proc && proc.stdin && !proc.stdin.destroyed) {
    proc.stdin.write('\x03\n')
  }
})
```

**文件**: `electron/preload.cjs`
**改动**:
```js
// 在 adbShellKill 后添加
adbShellFlushStdin: (id) => ipcRenderer.send('adb:shell:flush-stdin', id),
```

**文件**: `src/types/index.ts`
**改动**:
```typescript
// 在 adbShellKill 后添加
adbShellFlushStdin: (id: string) => void
```

**文件**: `src/pages/Devices.tsx`
**位置**: Ctrl+C handler (L294-302)

**改动**:
```js
// Before
if (data === '\x03') {
  const sel = term.getSelection()
  if (sel) { navigator.clipboard.writeText(sel); return }
  window.electronAPI.adbShellWrite(shellId, '\x03')
  term.write('^C\r\n' + promptPrefix)
  inputBuffer.current = ''
  cursorPos.current = 0
  if (promptTimer) clearTimeout(promptTimer)
  return
}

// After
if (data === '\x03') {
  window.electronAPI.adbShellWrite(shellId, '\x03')
  window.electronAPI.adbShellFlushStdin(shellId)
  term.write('^C\r\n' + promptPrefix)
  inputBuffer.current = ''
  cursorPos.current = 0
  if (promptTimer) clearTimeout(promptTimer)
  return
}
```

**verify**: 输入 `abc` 后 Ctrl+C，再输入 `ls`，执行结果正常

---

### Step 3: BUG-003 — 复制功能

**文件**: `src/pages/Devices.tsx`
**位置**: xterm 初始化后（`term.open()` 之后）

**改动**:
```js
// 在 term.open(termRef.current!) 和 term.focus() 之后添加
term.onSelectionChange(() => {
  const sel = term.getSelection()
  if (sel) {
    navigator.clipboard.writeText(sel)
  }
})
```

**改动**: 移除 Ctrl+C handler 中的复制逻辑（已在 Step 2 中完成）

**verify**: 执行 `echo hello`，选中 `hello`，在记事本中粘贴

---

### Step 4: BUG-004 — 最后一行可见

**文件**: `src/pages/Devices.tsx`
**位置**: `writePrompt` 函数 (L134-138)

**改动**:
```js
// Before
const writePrompt = () => {
  term.write('\r' + promptPrefix)
  if (inputBuffer.current) term.write(inputBuffer.current)
  cursorPos.current = inputBuffer.current.length
}

// After
const writePrompt = () => {
  term.write('\r' + promptPrefix)
  if (inputBuffer.current) term.write(inputBuffer.current)
  cursorPos.current = inputBuffer.current.length
  term.scrollToBottom()
}
```

**verify**: 执行 `ls -la /system`，最后一行 prompt 始终可见

---

## File Change Summary

| 文件 | 改动类型 | 行数估计 |
|------|----------|----------|
| `src/pages/Devices.tsx` | 修改 | ~15 行 |
| `electron/main.cjs` | 新增 handler | ~6 行 |
| `electron/preload.cjs` | 新增暴露 | ~1 行 |
| `src/types/index.ts` | 新增类型 | ~1 行 |

**总计**: ~23 行改动

## Dependencies

无新依赖。使用现有 xterm.js API 和 Electron IPC。

## Risk Assessment

- **低风险**: 所有改动都是局部的，不影响其他功能
- **回归风险**: Step 1 的格式化可能影响 ANSI 转义序列，需验证颜色输出
- **兼容性**: `navigator.clipboard.writeText` 需要用户手势或页面焦点，xterm.js 的 selection change 事件通常满足此条件
