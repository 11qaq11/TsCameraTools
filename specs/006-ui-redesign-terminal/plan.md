# Implementation Plan

**Spec**: specs/006-ui-redesign-terminal/spec.md
**Created**: 2026-07-07
**Tech Stack**: React 19 + TypeScript + Tailwind CSS 4 + Express + Socket.io

## Technical Context

- **Language**: TypeScript 6.0
- **Framework**: React 19 (Vite 8)
- **Backend**: Express + Socket.io
- **Terminal**: ttyd v1.7.7 (iframe 嵌入)
- **Icons**: lucide-react
- **Fonts**: Plus Jakarta Sans + JetBrains Mono

## Architecture

### Components

- `Sidebar`: 可折叠左侧导航栏，数据驱动菜单配置
- `Header`: 顶部栏，显示页面标题和用户信息
- `MainLayout`: 主布局，组合 Sidebar + Header + Content
- `TtydTerminal`: ttyd 终端包装组件，管理 iframe 和 ttyd 进程
- `DeviceCard`: 设备卡片，保留 Root/Remount/Connect 功能

### Data Flow

```
用户点击 Connect → 前端调用 API 启动 ttyd → 后端 spawn ttyd 进程 → 返回 ttyd URL → 前端 iframe 加载
```

## Research Decisions

详见 `research.md`

## Implementation Phases

### Phase 1: Light 主题重构

**目标**: 将界面从 Dark OLED 切换到 Light 主题

1. 更新 `src/index.css` 的 @theme 色彩 token（替换全部 Dark OLED 颜色值）
2. 更新 `body` 背景色和文字色
3. `grep -r "#0F172A\|#1E293B\|#334155\|#22C55E" src/ --include="*.tsx" -l` 找到所有硬编码颜色，逐一替换为 CSS 变量

**验证**: 页面整体为 Light 风格，文字对比度 >= 4.5:1

### Phase 2: 导航栏重构

**目标**: 实现可扩展的左侧导航栏

1. 定义 `NavItem` 类型到 `src/types/index.ts`
2. 创建导航配置数组到 `src/config/navigation.ts`
3. 重写 `src/components/Sidebar.tsx`，支持展开/折叠、分组、图标
4. 更新 `src/layouts/MainLayout.tsx` 适配新 Sidebar
5. 更新 `src/App.tsx` 路由，支持多工具页面
6. 更新 `src/components/Header.tsx` 的 `pageTitles` 映射，与新路由同步
7. 更新 `.env.example`，新增 TTYD 相关变量
8. 删除 `src/config/default.ts`（DARK_THEME/DEFAULT_COLORS/DEFAULT_UI_STATE，仅旧终端使用）

**验证**: 导航栏展开/折叠正常，点击菜单切换页面正常，Header 标题与路由一致

### Phase 3: ttyd 集成

**目标**: 用 ttyd 替换自实现终端

1. 下载 ttyd Windows x64 二进制到 `bin/ttyd/ttyd.exe`
2. 创建 `server/services/ttyd.ts`，管理 ttyd 子进程生命周期
3. 创建 `server/routes/ttyd.ts`，提供 ttyd 启动/停止/状态 API
4. 在 `server/index.ts` 注册 ttyd 路由
5. 创建 `src/components/terminal/TtydTerminal.tsx`，iframe 包装组件
6. 修改 `src/pages/DevicesWeb.tsx`，Connect 按钮调用 ttyd API
7. 删除以下旧终端相关文件（共 8 个）：
   - `src/components/terminal/HyperTerminal.tsx`
   - `src/components/terminal/Term.tsx`
   - `src/components/terminal/Header.tsx`
   - `src/components/terminal/SearchBox.tsx`
   - `src/components/terminal/StatusBar.tsx`
   - `src/types/hyper.ts`
   - `src/hooks/useTerminal.ts`
   - `server/services/shell.ts`

**验证**: 点击 Connect 打开 ttyd 终端，可正常执行 adb shell 命令

### Phase 4: 清理与优化

**目标**: 删除废弃代码，确保构建通过

1. 精简 `src/store/reducers/ui.ts`，移除终端配置（cursorShape/cursorBlink/scrollback 等），保留主题相关 state
2. 精简 `src/store/reducers/ui.test.ts`，同步更新测试
3. 删除 `src/components/terminal/Header.test.tsx`（随旧组件删除）
4. 删除 `src/components/terminal/StatusBar.test.tsx`（随旧组件删除）
5. 更新 `server/index.ts`，移除旧 shell socket handler 注册
6. 更新 `.env.example`，确保包含所有新变量
7. 运行 `npm run web:build` 验证编译通过
8. 运行 `npm run lint` 验证代码规范

**验证**: 构建通过，无 TypeScript 错误，无 lint 错误

## Data Model

详见 `data-model.md`

## Contracts

详见 `contracts/ttyd-api.md`

## Phase Dependencies

```
Phase 1 (Light Theme) ──→ Phase 3 (ttyd config uses Light tokens)
Phase 2 (Navigation)  ──→ Phase 3 (DevicesWeb page layout)
Phase 3 (ttyd)        ──→ Phase 4 (cleanup deletes old code)
```

Phase 1 和 Phase 2 可并行开发。Phase 3 依赖两者完成。Phase 4 必须最后执行。

## Security

### ttyd 认证

ttyd 默认无认证，启动时必须配置 `--credential` 参数：

```bash
ttyd.exe -p 7681 -c user:password adb -s {serial} shell
```

凭证来源：`.env` 中的 `TTYD_CREDENTIAL` 变量，格式 `username:password`。

### 端口暴露

ttyd 监听 localhost，不暴露到外网。前端通过同源 iframe 访问。

### .env 新增变量

```env
# ttyd 配置
TTYD_PORT_START=7681        # 起始端口
TTYD_PORT_END=7690          # 结束端口
TTYD_CREDENTIAL=admin:admin # 终端认证凭证
```

## Logging

ttyd 进程事件接入现有 logger 体系（`src/utils/logger.ts`）：

- 启动成功：`logger.info('Ttyd', 'Session started: {sessionId} on port {port}')`
- 进程退出：`logger.warn('Ttyd', 'Session exited: {sessionId}, code={code}')`
- 启动失败：`logger.error('Ttyd', 'Failed to start: {error}')`

## Rollback Plan

所有回退通过 `git revert` 实现，不保留运行时切换开关。

| 场景 | 回退操作 |
|------|----------|
| ttyd 二进制不兼容 | `git revert` Phase 3 提交，恢复 `server/services/shell.ts` |
| Light 主题可读性差 | `git revert` Phase 1 提交，恢复 `src/index.css` 原 @theme |
| 导航栏布局问题 | `git revert` Phase 2 提交，恢复旧 Sidebar.tsx |

## Testing Strategy

### 现有测试影响分析

**将被删除的测试文件**（随旧终端组件一起移除）：
- `src/components/terminal/Header.test.tsx`
- `src/components/terminal/StatusBar.test.tsx`

**需要更新的测试文件**：
- `src/components/Sidebar.test.tsx` — 适配新导航栏组件
- `src/store/reducers/ui.test.ts` — 移除终端相关 reducer 测试，保留主题测试

**不受影响的测试文件**：
- `src/components/ErrorBoundary.test.tsx`
- `src/components/LogViewer.test.tsx`
- `src/components/Header.test.tsx`
- `src/utils/logger.test.ts`
- `src/utils/auth.test.ts`
- `src/store/reducers/sessions.test.ts`
- `tests/integration/*.test.ts`
- `tests/e2e/*.spec.ts`

### 新增测试文件

| 测试文件 | 覆盖范围 | 优先级 |
|---------|---------|--------|
| `src/config/navigation.test.ts` | NavItem 配置完整性、路径唯一性 | P0 |
| `src/components/Sidebar.test.tsx` | 展开/折叠、菜单高亮、分组渲染 | P0 |
| `src/components/terminal/TtydTerminal.test.tsx` | iframe 渲染、加载状态、错误状态 | P0 |
| `server/services/ttyd.test.ts` | 进程启动/停止、端口分配、状态查询 | P1 |
| `server/routes/ttyd.test.ts` | API 请求/响应、错误处理 | P1 |
| `src/pages/DevicesWeb.test.tsx` | 设备列表、Connect 按钮、ttyd 调用 | P1 |

### 测试覆盖率目标

项目 vitest.config.ts 已有全局 80% 阈值，无需逐模块设定。

| 模块 | 目标 | 说明 |
|------|------|------|
| 全局 | 80% | vitest.config.ts 已配置 |
| `src/config/navigation.ts` | 100% | 配置数据，必须完整覆盖 |

### 测试运行命令

```bash
# 前端单元测试
npm test

# 服务端单元测试
npm run test:server

# 全部测试
npm run test:all

# 覆盖率报告
npm run test:coverage

# 特定模块测试
npm test -- Sidebar
npm test -- TtydTerminal
npm run test:server -- ttyd
```

详见 `testing.md`

## Quickstart

详见 `quickstart.md`
