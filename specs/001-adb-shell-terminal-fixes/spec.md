# ADB Shell Terminal 修复与增强

**Status**: Draft
**Created**: 2026-07-04
**Author**: AI Agent

## Overview

ADB Shell 终端存在 4 个 bug 需要修复，以及 2 个功能需要实现。

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

### Bug 修复

**BUG-001**: 连接信息前缺少空格
- 现象：连接信息 "adb shell connected to 设备号" 前没有空格
- 预期：连接信息前应有空格
- 验证：连接设备后，终端显示 " adb shell connected to 设备号"

**BUG-002**: 启动时 ADB 检测失败
- 现象：程序启动后不自动检测 ADB
- 预期：启动后立即执行 ADB 检测并显示设备列表
- 验证：启动程序，2 秒内显示设备列表或 ADB 安装引导

**BUG-003**: 中文输入不工作
- 现象：使用输入法时中文字符无法输入
- 预期：输入法中文字符能正确显示，无重复输入
- 验证：使用微软拼音输入法输入中文，终端正确显示

**BUG-004**: 窗口化模式最后一行不可见
- 现象：终端内容超出窗口高度时，最后一行被截断
- 预期：最后一行输入内容始终可见
- 验证：调整窗口大小，最后一行始终可见

### 功能实现

**FEAT-001**: 命令历史导航
- 功能：上下方向键能导航命令历史
- 规则：
  - 最大 300 条历史记录
  - 空命令不加入历史
  - 重复命令去重（连续相同命令只保留一条）
  - 切换设备不清空历史（跨会话保持）
  - 同步 Linux 系统的上下方向键行为
- 验证：执行多条命令后，上下方向键能正确导航

**FEAT-002**: 历史命令搜索
- 功能：Ctrl+R 能搜索历史命令
- 行为：
  - Ctrl+R 进入反向搜索模式
  - 显示搜索提示符 `(reverse-i-search)'query':`
  - 输入字符实时匹配历史命令
  - Enter 执行匹配到的命令
  - Esc 取消搜索，恢复原命令行
- 验证：按 Ctrl+R，输入关键词，找到匹配命令并执行

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
- **SC-003**: 上下方向键能正确导航命令历史，行为与 Linux 终端一致
- **SC-004**: Ctrl+R 能搜索并执行历史命令
- **SC-005**: 窗口化模式下，最后一行输入内容始终可见

## Key Entities

- **CommandHistory**: 存储执行过的命令，支持导航和搜索
  - 最大容量：300 条
  - 存储：内存数组
  - 去重：连续相同命令只保留一条
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
