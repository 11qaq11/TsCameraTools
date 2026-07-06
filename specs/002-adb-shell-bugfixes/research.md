# Research: ADB Shell Bug Fixes

**Created**: 2026-07-04

## R1: ADB Shell 输出缺少开头空格

### 问题分析

当前代码 `Devices.tsx:126` 定义了自定义 prompt：
```js
const promptPrefix = ' \x1b[36m' + model + '\x1b[0m \x1b[32m$\x1b[0m '
```

但 adb shell 进程自身的输出（如命令执行结果）没有前导空格。`handleData`（L419-424）直接写入原始数据：
```js
term.write(data)
```

### Decision

在 `handleData` 中对 adb shell 输出做预处理：每行开头添加一个空格（`\x1b[0m `），使输出与 prompt 对齐。

### Rationale

- 最小改动，仅影响输出渲染
- 不改变 adb shell 进程本身的行为
- 使用 ANSI reset + 空格确保不影响颜色

### Alternatives

1. **修改 adb shell 进程的 prompt** — 需要发送 `export PS1=" ..."` 命令，不可靠（不同设备 shell 不同）
2. **在 xterm.js 层面做 post-processing** — 复杂，需要拦截 write 调用

---

## R2: Ctrl+C 未清空 stdin 输入队列

### 问题分析

当前 Ctrl+C 处理（`Devices.tsx:294-302`）：
```js
if (data === '\x03') {
  window.electronAPI.adbShellWrite(shellId, '\x03')
  term.write('^C\r\n' + promptPrefix)
  inputBuffer.current = ''
  cursorPos.current = 0
}
```

问题：只清空了前端 `inputBuffer`，但 adb shell 进程的 stdin 可能仍有未处理的字符。当用户快速输入后按 Ctrl+C，那些字符仍在 stdin 缓冲区中，下次输入时会被 shell 当作命令执行。

### Decision

在主进程 `main.cjs` 中增加 `adb:shell:clear-input` IPC handler：
- 通过 `proc.stdin.destroy()` + 重新 spawn 来清空 stdin 队列
- 或者更简单：直接写入 `\x03` 多次 + `\n` 来 flush

实际方案：在 main.cjs 中增加一个 `flushStdin` 方法，在发送 Ctrl+C 后额外发送一个换行符来消耗缓冲区。

### Rationale

- Node.js 的 `Writable` stream 没有直接的 `flush()` 方法
- 发送额外 `\n` 可以让 shell 执行（或忽略）缓冲区中的内容
- 重新 spawn 是最可靠的方案但开销大

### Alternatives

1. **前端多次发送 `\x03`** — 简单但不可靠，shell 可能不会处理所有信号
2. **重建 shell 进程** — 最可靠但用户体验差（会丢失 shell 状态）
3. **使用 `proc.stdin.cork()/uncork()`** — Node.js stream 方法，不确定对 child_process 的效果

---

## R3: ADB Shell 终端内无法复制

### 问题分析

当前代码（`Devices.tsx:294-296`）将复制逻辑绑在 Ctrl+C 上：
```js
if (data === '\x03') {
  const sel = term.getSelection()
  if (sel) { navigator.clipboard.writeText(sel); return }
  // ... send SIGINT
}
```

问题：
1. xterm.js 的 `getSelection()` 在无选中时返回空字符串 `""`，`if (sel)` 为 false，逻辑正确
2. 但用户不知道可以用 Ctrl+C 复制（这不是标准行为）
3. 更严重的是：当有选中文本时，Ctrl+C 不再发送 SIGINT，这会让用户困惑

### Decision

方案：启用 xterm.js 的右键菜单（`rightClickSelectsWord: true`）+ 支持鼠标选中自动复制到剪贴板（`selection: true`）+ 添加 Ctrl+Shift+C 作为显式复制快捷键。

具体改动：
1. Terminal 配置添加 `allowProposedApi: true`（如需要）
2. 使用 xterm.js 的 `addon-clipboard` 或手动实现
3. Ctrl+C 始终发送 SIGINT，不参与复制
4. 鼠标选中文本后自动复制到系统剪贴板（通过 `term.onSelectionChange`）

### Rationale

- 符合终端模拟器的标准行为（Windows Terminal、GNOME Terminal 等都是选中即复制）
- Ctrl+C 保持纯粹的 SIGINT 功能
- xterm.js 原生支持 `onSelectionChange` 事件

### Alternatives

1. **保持 Ctrl+C 双重功能** — 容易混淆
2. **添加右键菜单** — 需要自定义 DOM，复杂
3. **使用 xterm-addon-clipboard** — 需要额外依赖

---

## R4: 非全屏模式下最后一行被隐藏

### 问题分析

布局结构：
```
MainLayout: div.flex.h-screen > main.flex-1.overflow-hidden
Devices: div.flex.flex-col.h-full.gap-6.pb-6
ShellPanel: div.flex.flex-col.flex-1.min-h-0.overflow-hidden
  > div (header)
  > div.flex-1 (xterm container)
```

问题链：
1. `MainLayout.tsx:11` 的 `main` 有 `overflow-hidden`
2. `Devices.tsx:550` 的容器有 `h-full` + `gap-6` + `pb-6`
3. ShellPanel 的 `flex-1 min-h-0` 使其可以收缩到比内容更小
4. xterm.js 的 FitAddon 根据容器 `clientHeight` 计算行数，可能截断最后一行

### Decision

修复方案：
1. 在 ShellPanel 的 xterm 容器 div 上确保 `overflow: auto`（而非 hidden）
2. 确保 FitAddon 在 resize 时正确计算可用高度
3. 在 `writePrompt` 后调用 `term.scrollToBottom()` 确保最后一行可见

### Rationale

- xterm.js 本身有滚动能力，问题在于容器尺寸计算
- `scrollToBottom()` 是最直接的修复
- 不需要改变整体布局结构

### Alternatives

1. **修改 MainLayout 的 overflow** — 影响全局布局
2. **使用固定高度而非 flex** — 不响应式
3. **启用 xterm.js 的 scrollback buffer** — 不解决根本问题
