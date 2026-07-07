# Data Model

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07

## Entities

### NavItem

导航菜单项，映射到 FR-001, FR-002, FR-008

| Field | Type | Description |
|-------|------|-------------|
| id | string | 唯一标识 |
| label | string | 显示名称 |
| icon | React.ReactNode | 图标组件 |
| path | string | 路由路径 |
| group | string? | 分组名称（可选） |
| badge | string\|number? | 角标（可选） |
| children | NavItem[]? | 子菜单（可选） |

**映射到用户故事**: 影像开发工程师需要通过导航栏快速切换工具

### TtydSession

ttyd 终端会话，映射到 FR-005, FR-006

| Field | Type | Description |
|-------|------|-------------|
| id | string | 会话 UUID |
| serial | string | 设备序列号 |
| port | number | ttyd 监听端口 |
| pid | number | ttyd 进程 PID |
| status | 'starting'\|'running'\|'stopped' | 会话状态 |
| createdAt | number | 创建时间戳 |

**映射到用户故事**: 用户点击 Connect 后创建 ttyd 会话

## Relationships

```
NavItem (1) ──── (*) Route
TtydSession (1) ──── (1) Device (by serial)
```

## State Transitions

### TtydSession

```
[创建] → starting → running → stopped
                  ↘ stopped (启动失败)
```
