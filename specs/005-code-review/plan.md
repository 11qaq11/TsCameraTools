# Plan: 代码审查与质量提升

**Created**: 2026-07-07
**Status**: Ready

## Overview

对项目所有代码进行逐行审查，发现并修复逻辑漏洞；更新项目文档；设计全面的自动化测试脚本。

## Technical Context

- **前端**: React 19 + TypeScript + Vite 8 + Tailwind CSS 4
- **后端**: Express + Socket.io
- **桌面**: Electron 43
- **终端**: xterm.js
- **测试**: Vitest + React Testing Library + Playwright

## Implementation Steps

### Phase 1: 代码审查 (41 个任务)

#### Phase 1.1: 前端核心模块 (15 个任务)

**T001: src/App.tsx**
- 审查路由配置
- 审查 ProtectedRoute 逻辑
- 审查懒加载实现
- 审查认证检查

**T002: src/main.tsx**
- 审查 Redux Provider 配置
- 审查 HashRouter 配置
- 审查根组件渲染

**T003: src/pages/Devices.tsx** ⚠️ 复杂度高
- 审查 ShellPanel 组件逻辑
- 审查 ADB 命令执行
- 审查终端事件处理
- 审查中文输入处理
- 审查命令历史管理
- 审查搜索功能

**T004: src/pages/DevicesWeb.tsx**
- 审查 Socket 通信逻辑
- 审查 ADB API 调用
- 审查设备列表管理
- 审查错误处理

**T005-T006: src/pages/Login.tsx, AuthCallback.tsx**
- 审查飞书 OAuth 流程
- 审查 Token 存储
- 审查错误处理

**T007: src/components/terminal/Term.tsx**
- 审查 xterm.js 初始化
- 审查 Addon 加载
- 审查事件监听
- 审查资源清理

**T008: src/components/terminal/HyperTerminal.tsx**
- 审查组件组合逻辑
- 审查 Socket 事件处理
- 审查终端状态管理

**T009-T015: 其他组件**
- SearchBox.tsx
- StatusBar.tsx
- Header.tsx
- Sidebar.tsx
- ErrorBoundary.tsx
- LogViewer.tsx

#### Phase 1.2: 前端 Hooks (4 个任务)

**T016: src/hooks/useAuth.ts**
- 审查认证状态管理
- 审查 Token 刷新逻辑
- 审查登出处理

**T017: src/hooks/useSocket.ts**
- 审查 Socket 连接管理
- 审查重连逻辑
- 审查事件处理

**T018: src/hooks/useTerminal.ts**
- 审查终端生命周期
- 审查数据发送
- 审查状态管理

**T019: src/hooks/useSearch.ts**
- 审查搜索功能逻辑

#### Phase 1.3: 前端工具和配置 (9 个任务)

**T020: src/utils/auth.ts**
- 审查 Token 管理
- 审查 API 请求封装

**T021: src/utils/logger.ts**
- 审查日志工具
- 审查错误处理

**T022-T024: src/store/**
- index.ts
- reducers/ui.ts
- reducers/sessions.ts

**T025-T028: 其他**
- config/default.ts
- types/index.ts
- types/hyper.ts
- layouts/MainLayout.tsx

#### Phase 1.4: 后端模块 (7 个任务)

**T029: server/index.ts**
- 审查 Express 配置
- 审查 Socket.io 集成
- 审查中间件配置

**T030: server/config.ts**
- 审查配置管理
- 审查环境变量

**T031: server/routes/auth.ts**
- 审查 OAuth 流程
- 审查 Token 验证

**T032: server/routes/adb.ts**
- 审查 ADB 命令执行
- 审查设备列表获取

**T033: server/routes/logs.ts**
- 审查日志 API

**T034: server/services/shell.ts**
- 审查 Shell 进程管理
- 审查 Socket 事件处理

**T035: server/types/index.ts**
- 审查类型定义

#### Phase 1.5: Electron 模块 (2 个任务)

**T036: electron/main.cjs**
- 审查窗口创建
- 审查 IPC 处理
- 审查 ADB 功能实现

**T037: electron/preload.cjs**
- 审查 API 暴露
- 审查安全性

#### Phase 1.6: 配置文件 (4 个任务)

**T038-T041:**
- package.json
- vite.config.ts
- tsconfig.json
- .oxlintrc.json

### Phase 1.7: Ponytail Review (41 个任务)

每个文件审查后立即执行 Ponytail Review，检查：
- 是否有过度工程
- 是否有可删除的代码
- 是否有可简化的逻辑
- 是否有可复用的标准库

### Phase 2: 文档更新 (13 个任务)

#### Phase 2.1: 项目文档 (4 个任务)

**T050: README.md**
- 更新项目结构
- 更新功能说明
- 更新快速开始
- 更新技术栈

**T051: README-WEB.md**
- 更新 Web 模式文档

**T052: AGENTS.md**
- 更新开发准则
- 更新架构速查

**T053: specs/**
- 更新所有规范文档状态

#### Phase 2.2: 开发规范 (5 个任务)

**T054-T058:**
- 代码风格规范
- Git 工作流规范
- 测试规范
- 文档规范
- 安全规范

#### Phase 2.3: 上下文记忆文件 (4 个任务)

**T059: .specify/memory/constitution.md**
- 项目开发规范宪法

**T060: .specify/memory/decisions.md**
- 技术决策记录

**T061: .specify/memory/conventions.md**
- 代码约定

**T062: .specify/memory/api-docs.md**
- API 文档

### Phase 3: 自动化测试 (23 个任务)

#### Phase 3.1: 测试配置 (3 个任务)

**T070: 安装测试依赖**
- vitest
- @testing-library/react
- @testing-library/jest-dom
- @testing-library/user-event
- playwright

**T071: 创建测试配置**
- vitest.config.ts
- playwright.config.ts

**T072: 创建测试工具**
- test-utils.tsx
- mock-utils.ts

#### Phase 3.2: 单元测试 (8 个任务)

**T073-T080:**
- src/utils/auth.ts
- src/utils/logger.ts
- src/store/reducers/ui.ts
- src/store/reducers/sessions.ts
- src/hooks/useAuth.ts
- src/hooks/useSocket.ts
- src/hooks/useTerminal.ts
- src/hooks/useSearch.ts

#### Phase 3.3: 组件测试 (10 个任务)

**T081-T090:**
- src/App.tsx
- src/components/ErrorBoundary.tsx
- src/components/Sidebar.tsx
- src/components/Header.tsx
- src/components/LogViewer.tsx
- src/components/terminal/Term.tsx
- src/components/terminal/HyperTerminal.tsx
- src/components/terminal/SearchBox.tsx
- src/components/terminal/StatusBar.tsx
- src/components/terminal/Header.tsx

#### Phase 3.4: 集成测试 (4 个任务)

**T091-T094:**
- ADB 设备连接流程
- Shell 终端交互
- 飞书 OAuth 登录
- 日志记录功能

#### Phase 3.5: E2E 测试 (2 个任务)

**T095-T096:**
- 完整用户流程
- 错误处理流程

## File Change Summary

| 类别 | 文件数 | 预计改动行数 |
|------|--------|-------------|
| 前端组件 | 15 | ~200 行 |
| 前端 Hooks | 4 | ~50 行 |
| 前端工具 | 9 | ~100 行 |
| 后端模块 | 7 | ~100 行 |
| Electron 模块 | 2 | ~30 行 |
| 配置文件 | 4 | ~20 行 |
| 文档 | 13 | ~500 行 |
| 测试 | 23 | ~2000 行 |
| **总计** | **77** | **~3000 行** |

## Dependencies

- 测试依赖: vitest, @testing-library/react, playwright
- 无新运行时依赖

## Risk Assessment

- **低风险**: 文档更新、配置文件修改
- **中风险**: 组件重构、Hook 修改
- **高风险**: 核心业务逻辑修改（Devices.tsx, shell.ts）

## MVP Scope

Phase 1 + Phase 2（代码审查 + 文档更新）- 约 54 个任务
