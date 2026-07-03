# ADB Shell Terminal 修复与增强 - 技术方案

**Spec**: [spec.md](./spec.md)
**Created**: 2026-07-04
**Tech Stack**: Electron + React + TypeScript + xterm.js

## Technical Context

- **Language**: TypeScript (前端), JavaScript (Electron 主进程)
- **Framework**: React 19 + Vite 8
- **Terminal**: xterm.js + @xterm/addon-fit
- **IPC**: Electron contextBridge + ipcMain/ipcRenderer

## Bug 分析与修复方案

### BUG-001: 连接信息空格

**现状**: 连接信息 "adb shell connected to 设备号" 前缺少空格
**代码位置**: `src/pages/Devices.tsx` 第 114 行
**分析**: 代码中已有空格 `' \x1b[36madb shell\x1b[0m...'`，但实际显示无空格
**可能原因**: xterm.js 渲染 ANSI 转义码时可能吞掉前导空格
**修复方案**: 
- 方案 A: 将空格放在 ANSI 转义码之后：`'\x1b[36m adb shell\x1b[0m...'`
- 方案 B: 使用 HTML 实体 `&nbsp;`（不适用于 xterm.js）
- 方案 C: 使用 Unicode 空格 `\u00A0`

### BUG-002: 启动 ADB 检测

**现状**: 程序启动后不自动检测 ADB
**根因**: `useEffect` 中的 `checkAndRefresh()` 可能在 Electron API 就绪前执行
**修复方案**:
- 在 `main.cjs` 中添加 `app.whenReady()` 后发送就绪信号
- 在 `preload.cjs` 中暴露 `onAppReady` 事件
- 在 `Devices.tsx` 中等待就绪信号后再执行检测

### BUG-003: 中文输入

**现状**: 使用输入法时中文字符无法输入
**根因**: `composing` 标志在 `compositionend` 后立即清除，但 xterm.js 可能还未处理完
**修复方案**: 在 `compositionend` 后延迟清除 `composing` 标志（50-100ms）

### BUG-004: 终端高度

**现状**: 终端内容超出窗口高度时，最后一行被截断
**根因**: 终端容器高度计算不正确
**修复方案**:
- 确保终端容器使用正确的 flex 布局
- 添加 `overflow: hidden` 防止内容溢出
- 确保 `fitAddon.fit()` 在窗口调整大小时正确触发

## 功能实现方案

### FEAT-001: 命令历史导航

**数据结构**:
```typescript
const commandHistory: string[] = []  // 最大 300 条
let historyIndex: number = -1        // -1 表示当前位置（未选择历史）
```

**逻辑**:
- Enter 时：
  - 如果命令非空且与上一条不同，加入历史
  - 如果命令与上一条相同，不加入（去重）
  - 重置 historyIndex 为 -1
- 上方向键：
  - 如果 historyIndex < history.length - 1，递增
  - 显示 commandHistory[historyIndex]
- 下方向键：
  - 如果 historyIndex > -1，递减
  - historyIndex === -1 时显示当前输入缓冲区

### FEAT-002: 历史命令搜索

**状态**:
```typescript
const searchMode: boolean = false
const searchQuery: string = ''
const searchResults: string[] = []
let searchIndex: number = 0
```

**逻辑**:
- Ctrl+R：
  - 设置 searchMode = true
  - 显示搜索提示符 `(reverse-i-search)'query':`
- 搜索模式下的输入：
  - 添加字符到 searchQuery
  - 从 commandHistory 中反向匹配
  - 显示第一个匹配结果
- Enter：
  - 执行匹配到的命令
  - 退出搜索模式
- Esc：
  - 退出搜索模式
  - 恢复原命令行

## Implementation Phases

### Phase 1: Bug 修复 (BUG-001 ~ BUG-004)

1. 修复连接信息空格
2. 修复 ADB 启动检测
3. 修复中文输入
4. 修复终端高度

### Phase 2: 功能实现 (FEAT-001 ~ FEAT-002)

5. 实现命令历史导航
6. 实现历史命令搜索

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| xterm.js API 变化 | 中 | 使用稳定的公开 API |
| 输入法兼容性 | 低 | 测试主流输入法 |
| 命令历史内存占用 | 低 | 限制 300 条 |

## Quickstart

1. 启动程序，验证自动 ADB 检测
2. 连接设备，验证连接信息格式（空格）
3. 在终端中输入中文，验证显示正确
4. 调整窗口大小，验证终端高度自适应
5. 执行多条命令，验证上下方向键历史
6. 按 Ctrl+R，验证历史搜索功能
