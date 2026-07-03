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

### Bug 1: 连接信息前缺少空格

**现状**: 连接信息 "adb shell connected to 设备号" 前缺少空格
**根因**: `Devices.tsx` 第 114 行连接信息字符串开头缺少空格
**修复**: 在连接信息字符串开头添加空格

### Bug 2: 启动时 ADB 检测失败

**现状**: 程序启动后不自动检测 ADB
**根因**: `useEffect` 中的 `checkAndRefresh()` 可能在 Electron API 就绪前执行
**修复**: 
- 在 `main.cjs` 中添加 `app.whenReady()` 后发送就绪信号
- 在 `preload.cjs` 中暴露 `onAppReady` 事件
- 在 `Devices.tsx` 中等待就绪信号后再执行检测

### Bug 3: 中文输入不工作

**现状**: 使用输入法时中文字符无法输入
**根因**: `composing` 标志在 `compositionend` 后立即清除，但 xterm.js 可能还未处理完
**修复**: 在 `compositionend` 后延迟清除 `composing` 标志

### Bug 4: 窗口化模式最后一行不可见

**现状**: 终端内容超出窗口高度时，最后一行被截断
**根因**: 终端容器高度计算不正确，可能与 `gap-6` 和 `pb-6` 有关
**修复**: 
- 确保终端容器使用正确的 flex 布局
- 添加 `overflow: hidden` 防止内容溢出
- 确保 `fitAddon.fit()` 在窗口调整大小时正确触发

### Bug 5: 不支持上下方向键历史

**现状**: 按上下方向键无反应
**根因**: 未实现命令历史记录和导航逻辑
**修复**:
- 添加 `commandHistory` 数组存储执行过的命令
- 添加 `historyIndex` 跟踪当前位置
- 上方向键：显示上一条命令
- 下方向键：显示下一条命令
- Enter 时将命令加入历史

### Bug 6: 不支持 Ctrl+R 搜索

**现状**: Ctrl+R 无反应
**根因**: 未实现反向搜索功能
**修复**:
- 添加 `searchMode` 标志
- 添加 `searchQuery` 存储搜索关键词
- Ctrl+R 进入搜索模式
- 显示搜索提示符 `(reverse-i-search)'query':`
- 输入字符实时匹配历史命令
- Enter 执行匹配命令
- Esc 取消搜索

## Implementation Phases

### Phase 1: Bug 修复 (1-4)

1. 修复连接信息空格
2. 修复 ADB 启动检测
3. 修复中文输入
4. 修复终端高度

### Phase 2: 功能增强 (5-6)

5. 实现命令历史导航
6. 实现 Ctrl+R 搜索

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| xterm.js API 变化 | 中 | 使用稳定的公开 API |
| 输入法兼容性 | 低 | 测试主流输入法 |
| 命令历史内存占用 | 低 | 限制历史记录数量 |

## Quickstart

1. 启动程序，验证自动 ADB 检测
2. 连接设备，验证连接信息格式
3. 在终端中输入中文，验证显示正确
4. 调整窗口大小，验证终端高度自适应
5. 执行多条命令，验证上下方向键历史
6. 按 Ctrl+R，验证历史搜索功能
