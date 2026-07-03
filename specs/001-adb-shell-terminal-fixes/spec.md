# ADB Shell Terminal 修复与增强

**Status**: Draft
**Created**: 2026-07-04
**Author**: AI Agent

## Overview

ADB Shell 终端存在 6 个影响用户体验的问题，需要修复现有 bug 并增强终端交互能力。

## User Scenarios & Testing

### Primary User Story

作为 TsCameraTools 用户，我希望 ADB Shell 终端能够正常工作，包括：
- 启动时自动检测 ADB 可用性
- 终端正确显示连接信息和提示符
- 支持中文输入
- 支持完整的终端交互功能（命令历史、搜索）

### Acceptance Scenarios

1. **Given** 程序已启动，**When** ADB 已安装且设备已连接，**Then** 自动显示设备列表
2. **Given** 终端已打开，**When** 用户输入中文，**Then** 正确显示中文字符
3. **Given** 终端已打开，**When** 用户按上方向键，**Then** 显示上一条执行过的命令
4. **Given** 终端已打开，**When** 用户按 Ctrl+R，**Then** 进入历史命令搜索模式
5. **Given** 终端内容超出窗口高度，**When** 用户滚动到底部，**Then** 能看到完整的输入行

## Requirements

### Functional Requirements

**FR-001**: 程序启动时自动检测 ADB 可用性
- 启动后立即执行 ADB 检测
- 如果 ADB 可用，自动获取已连接设备列表
- 如果 ADB 不可用，显示安装引导界面

**FR-002**: 终端连接信息格式正确
- 连接信息 "adb shell connected to 设备号" 前需要有空格
- 提示符格式：` 设备名 $ `（设备名前有空格）

**FR-003**: 支持中文输入
- 使用输入法时，中文字符能正确显示
- 输入法组合期间不触发重复输入

**FR-004**: 终端高度自适应
- 窗口化模式下，终端内容不被截断
- 最后一行输入内容始终可见

**FR-005**: 支持命令历史导航
- 上方向键：显示上一条执行过的命令
- 下方向键：显示下一条执行过的命令
- 历史记录在会话期间保持

**FR-006**: 支持历史命令搜索
- Ctrl+R：进入反向搜索模式
- 输入关键词实时匹配历史命令
- Enter 执行匹配到的命令
- Esc 取消搜索

### Non-Functional Requirements

**NFR-001**: 响应性
- ADB 检测在 2 秒内完成
- 终端输入响应延迟 < 100ms

**NFR-002**: 兼容性
- 支持 Windows 10/11
- 支持常见输入法（微软拼音、搜狗等）

## Out of Scope

- ADB 无线连接
- 多设备同时终端
- 终端主题自定义
- 命令自动补全

## Success Criteria

- **SC-001**: 程序启动后 2 秒内自动显示设备列表（如果 ADB 可用且设备已连接）
- **SC-002**: 中文输入法输入的字符在终端正确显示，无重复输入
- **SC-003**: 上下方向键能正确导航命令历史
- **SC-004**: Ctrl+R 能搜索并执行历史命令
- **SC-005**: 窗口化模式下，最后一行输入内容始终可见

## Key Entities

- **CommandHistory**: 存储执行过的命令，支持导航和搜索
- **ShellSession**: 管理单个 ADB Shell 会话的生命周期

## Assumptions

- ADB 已安装在系统 PATH 中或应用数据目录
- 设备已通过 USB 连接并启用 USB 调试
- 用户使用 Windows 操作系统

## Dependencies

- Electron 主进程提供 ADB 检测和 Shell 管理
- xterm.js 提供终端渲染
- @xterm/addon-fit 提供终端尺寸适配

## Open Questions

无
