# Data Model: ADB Shell Bug Fixes

**Created**: 2026-07-04

## Entities

本修复不引入新实体，仅修改现有实体的行为。

### ShellSession (现有)

修改点：
- 增加 stdin flush 能力
- 增加 output formatting 能力

**状态变更**:
```
[Active] --Ctrl+C--> [Active] (flush stdin buffer)
[Active] --output--> [Active] (format with leading space)
```

### Terminal (xterm.js instance)

修改点：
- 增加 selection change 事件处理
- 增加 scrollToBottom 调用

## Entity-Story Mapping

| Bug | 实体 | 影响 |
|-----|------|------|
| BUG-001 输出空格 | ShellSession | 输出格式化 |
| BUG-002 Ctrl+C 清空 | ShellSession | stdin 管理 |
| BUG-003 复制功能 | Terminal | 剪贴板集成 |
| BUG-004 最后一行 | Terminal | 滚动行为 |
