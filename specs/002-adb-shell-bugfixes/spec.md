# Spec: ADB Shell Bug Fixes

**Created**: 2026-07-04
**Status**: Ready for Implementation

## Overview

ADB Shell 终端存在 4 个 bug 需要修复。

## User Scenarios & Testing

### Primary User Story

作为 TsCameraTools 用户，我希望 ADB Shell 终端能正确处理输出格式、中断信号、复制操作和滚动显示。

### Acceptance Scenarios

1. **Given** 终端已连接，**When** 执行命令，**Then** 输出每行前有空格对齐
2. **Given** 用户输入了内容，**When** 按 Ctrl+C，**Then** 输入被清空且不影响下次命令
3. **Given** 终端有输出，**When** 用鼠标选中文本，**Then** 自动复制到剪贴板
4. **Given** 输出内容超出窗口，**When** 查看终端，**Then** 最后一行始终可见

## Requirements

### BUG-001: 输出缺少开头空格
- 现象：adb shell 输出内容没有前导空格
- 预期：每行输出前添加一个空格
- 验证：执行 `ls` 命令，输出对齐

### BUG-002: Ctrl+C 未清空 stdin
- 现象：Ctrl+C 后输入队列残留导致下次命令异常
- 预期：Ctrl+C 后 stdin 缓冲区被清空
- 验证：快速输入后 Ctrl+C，再执行命令正常

### BUG-003: 终端内无法复制
- 现象：无法复制终端中的文本
- 预期：鼠标选中文本后自动复制到剪贴板
- 验证：选中文本后在其他应用粘贴

### BUG-004: 非全屏模式最后一行被隐藏
- 现象：输出填满窗口后最后一行被截断
- 预期：最后一行始终可见
- 验证：执行大量输出后最后一行可见

## Out of Scope

- ADB 无线连接
- 多设备终端
- 终端主题自定义
- 命令自动补全

## Success Criteria

- **SC-001**: 输出每行前有空格，与 prompt 对齐
- **SC-002**: Ctrl+C 后 stdin 干净，下次命令正常
- **SC-003**: 鼠标选中即复制，无需额外操作
- **SC-004**: 最后一行在任何窗口模式下可见
- **SC-005**: 所有现有功能（历史、搜索、中文输入）不受影响
