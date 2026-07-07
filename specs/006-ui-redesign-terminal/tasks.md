# Task Breakdown

**Feature**: specs/006-ui-redesign-terminal
**Plan**: plan.md
**Created**: 2026-07-07

## User Stories

| Story | 描述 | 优先级 |
|-------|------|--------|
| US1 | Light 主题界面（FR-004, NFR-003） | P1 |
| US2 | 可扩展导航栏（FR-001, FR-002, FR-003, FR-008） | P1 |
| US3 | ttyd 终端集成（FR-005, FR-006, FR-007） | P1 |
| US4 | 清理优化（构建验证） | P2 |

## Dependency Graph

```
US1 (Light Theme) ──┐
                    ├──→ US3 (ttyd) ──→ US4 (Cleanup)
US2 (Navigation)  ──┘

US1 和 US2 可并行开发
US3 依赖 US1 + US2 完成
US4 必须最后执行
```

---

## Phase 1: Setup

- [x] T001 [P] 下载 ttyd Windows x64 二进制到 `bin/ttyd/ttyd.exe`（从 https://github.com/tsl0922/ttyd/releases 下载 v1.7.7+）

## Phase 2: US1 — Light 主题

- [x] T002 [US1] 更新 `src/index.css` 的 @theme 色彩 token，替换 Dark OLED 颜色为 Light 主题色（Primary #2563EB, Background #F8FAFC, Foreground #0F172A, Card #FFFFFF, Border #E2E8F0, Muted #F1F5F9, Sidebar 系列色）
- [x] T003 [US1] 更新 `src/index.css` 的 `body` 背景色和文字色
- [x] T004 [P] [US1] grep 搜索 `src/` 下所有硬编码 Dark 颜色值（#0F172A, #1E293B, #334155, #22C55E 等），逐一替换为 CSS 变量
- [x] T005 [US1] 更新 `src/index.css` 中 Google Fonts 引用，添加 Plus Jakarta Sans
- [x] T006 [US1] 验证：页面整体为 Light 风格，文字对比度 >= 4.5:1（Chrome DevTools 检查）

## Phase 3: US2 — 导航栏

- [x] T007 [US2] 定义 `NavItem` 类型到 `src/types/index.ts`（id, label, icon, path, group?, badge?, children?）
- [x] T008 [US2] 创建 `src/config/navigation.tsx`，定义导航配置数组（设备连接 作为第一项）
- [x] T009 [US2] 创建 `src/config/navigation.test.tsx`，验证配置完整性（id 唯一、path 唯一、path 以 / 开头）
- [x] T010 [US2] 重写 `src/components/Sidebar.tsx`，支持展开/折叠、数据驱动菜单、分组、图标、tooltip
- [x] T011 [US2] 更新 `src/components/Sidebar.test.tsx`，适配新 Sidebar（渲染、展开/折叠、高亮、菜单点击）
- [x] T012 [US2] 更新 `src/layouts/MainLayout.tsx`，适配新 Sidebar 宽度变化
- [x] T013 [US2] 更新 `src/App.tsx` 路由，支持多工具页面（当前仅 `/#/` → DevicesWeb）
- [x] T014 [US2] 更新 `src/components/Header.tsx` 的 `pageTitles` 映射，与新路由同步
- [x] T015 [US2] 删除 `src/config/default.ts`（DARK_THEME / DEFAULT_COLORS / DEFAULT_UI_STATE）
- [x] T016 [US2] 更新 `.env.example`，新增 TTYD_PORT_START / TTYD_PORT_END / TTYD_CREDENTIAL
- [x] T017 [US2] 验证：导航栏展开/折叠正常，菜单切换正常，Header 标题一致

## Phase 4: US3 — ttyd 集成

- [x] T018 [US3] 创建 `server/services/ttyd.ts`，实现 checkBinary / startSession / stopSession / getStatus / findAvailablePort
- [x] T019 [US3] 创建 `server/services/ttyd.test.ts`，覆盖进程管理核心逻辑（mock child_process）
- [x] T020 [US3] 创建 `server/routes/ttyd.ts`，实现 POST /api/ttyd/start, POST /api/ttyd/stop, GET /api/ttyd/status/:sessionId, GET /api/ttyd/check
- [x] T021 [US3] 创建 `server/routes/ttyd.test.ts`，覆盖 API 请求/响应/错误处理
- [x] T022 [US3] 更新 `server/index.ts`，注册 ttyd 路由
- [x] T023 [US3] 创建 `src/components/terminal/TtydTerminal.tsx`，iframe 包装组件（加载状态、错误状态、生命周期管理）
- [x] T024 [US3] 创建 `src/components/terminal/TtydTerminal.test.tsx`，覆盖渲染、错误、生命周期
- [x] T025 [US3] 更新 `src/pages/DevicesWeb.tsx`，Connect 按钮调用 ttyd start API，断开调用 stop API
- [x] T026 [US3] 更新 `src/pages/DevicesWeb.test.tsx`，覆盖设备列表、Connect 流程、断开连接
- [x] T027 [US3] 验证：点击 Connect 打开 ttyd 终端，可执行 adb shell，支持中文输入

## Phase 5: US4 — 清理优化

- [x] T028 [US3] 删除旧终端组件：`src/components/terminal/HyperTerminal.tsx`, `Term.tsx`, `Header.tsx`, `SearchBox.tsx`, `StatusBar.tsx`
- [x] T029 [US3] 删除旧终端类型：`src/types/hyper.ts`
- [x] T030 [US3] 删除旧终端 hook：`src/hooks/useTerminal.ts`
- [x] T031 [US3] 删除旧终端服务：`server/services/shell.ts`
- [x] T032 [US3] 删除旧终端测试：`src/components/terminal/Header.test.tsx`, `src/components/terminal/StatusBar.test.tsx`
- [x] T033 [US4] 精简 `src/store/reducers/ui.ts`，移除终端配置（cursorShape / cursorBlink / scrollback / foregroundColor / backgroundColor / cursorColor / selectionColor / borderColor / colors / webGLRenderer / copyOnSelect / bell），保留主题相关 state
- [x] T034 [US4] 精简 `src/store/reducers/ui.test.ts`，同步更新测试
- [x] T035 [US4] 更新 `server/index.ts`，移除旧 shell socket handler 注册（setupShellSocket 调用）
- [x] T036 [US4] 创建 `vitest.server.config.ts`，配置服务端测试环境（node, server/**）
- [x] T037 [US4] 更新 `package.json`，新增 test:server / test:all / test:coverage 脚本
- [x] T038 [US4] 运行 `npm run web:build` 验证编译通过
- [x] T039 [US4] 运行 `npm run lint` 验证代码规范
- [x] T040 [US4] 运行 `npm run test:all` 验证全部测试通过

## Phase 6: NFR 验证

- [x] T041 [US1] 验证 NFR-001：Chrome DevTools Network 面板测量首屏加载 < 2 秒
- [x] T042 [US3] 验证 NFR-002：ttyd 终端输入响应延迟 < 50ms（体感验证）
- [x] T043 [US2] 验证 NFR-005：1024px / 1280px / 1440px 三个断点布局正常，无水平滚动条

---

## Summary

| 指标 | 值 |
|------|-----|
| 总任务数 | 43 |
| Phase 1 (Setup) | 1 |
| Phase 2 (US1 Light Theme) | 5 |
| Phase 3 (US2 Navigation) | 11 |
| Phase 4 (US3 ttyd) | 10 |
| Phase 5 (US4 Cleanup) | 13 |
| Phase 6 (NFR 验证) | 3 |
| 并行任务 [P] | 2（T001, T004） |
| 用户故事 | US1: 6, US2: 12, US3: 13, US4: 8, NFR: 3 |

## MVP Scope

最小可验证版本需完成：T001 ~ T027 + T041~T043（共 30 个任务）

- Light 主题 + 导航栏 + ttyd 终端可运行
- 清理优化（T028~T040）可后续迭代
