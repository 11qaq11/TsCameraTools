# TsCameraTools - 项目开发准则

本项目所有 AI agent 回答必须同时遵守以下核心准则。

---

## 项目简介

影像开发工具箱 IDE，基于 Electron + React + TypeScript + Tailwind CSS。
功能：ADB 设备检测/安装/连接、交互式 Shell 终端（xterm.js）。

## 命令

```bash
npm run dev            # Vite 开发服务器（前端热更新）
npm run build          # tsc -b && vite build（包含类型检查）
npm run lint           # oxlint 代码检查（非 eslint）
npm run electron:dev   # Electron 开发模式（Vite + Electron 并行）
npm run electron:build # tsc -b + Vite 构建 + electron-builder 打包 Windows exe
```

`npm run build` 包含 `tsc -b` 类型检查，失败即构建失败。
`npm run electron:build` 是完整打包流程，产物在 `release/win-unpacked/TsCameraTools.exe`。

---

## 架构速查

- **文件编码：** 所有文件统一使用 **UTF-8** 编码（源代码、配置文件、文档、脚本等）
- **路径别名：** `@` → `./src`（vite.config.ts 中配置）
- **Electron 文件必须 `.cjs`：** `package.json` 有 `"type": "module"`，Electron 主进程不支持 ESM，所以 `electron/main.cjs` 和 `electron/preload.cjs` 使用 CommonJS
- **Tailwind CSS v4：** 主题通过 `@theme` 定义在 `src/index.css`，**没有** `tailwind.config.js` 文件
- **路由：** 使用 `HashRouter`（不是 BrowserRouter），路径格式为 `/#/path`
- **Linter：** `oxlint`（不是 eslint），配置在 `.oxlintrc.json`
- **UI 语言：** 中文（组件文本、标签、提示信息均为中文）
- **IPC 模式：** `electron/main.cjs`（handler）→ `electron/preload.cjs`（暴露 API）→ `src/types/index.ts`（类型定义）→ 前端通过 `window.electronAPI` 调用

---

## 文件结构

```
TsCameraTools/
├── electron/
│   ├── main.cjs            # Electron 主进程（IPC handlers, ADB 逻辑）
│   └── preload.cjs         # preload 桥接（暴露 electronAPI）
├── src/
│   ├── main.tsx            # React 入口
│   ├── App.tsx             # 路由定义
│   ├── index.css           # 全局样式 + Tailwind v4 @theme 主题
│   ├── components/
│   │   ├── Sidebar.tsx     # 侧边栏导航
│   │   └── Header.tsx      # 顶部栏
│   ├── layouts/
│   │   └── MainLayout.tsx  # 主布局（侧边栏 + Header + Outlet）
│   ├── pages/
│   │   └── Devices.tsx     # 设备连接页（ADB 检测/安装/名片/终端）
│   ├── types/
│   │   └── index.ts        # 全局接口（ElectronAPI 等）
│   └── utils/
│       └── logger.ts       # 日志工具（控制台 + 文件）
├── .opencode/skills/        # AI agent skills（按需加载）
├── .specify/                # Spec-Driven Development 配置
├── specs/                   # 功能规格文档
├── scripts/
│   └── test.ps1            # PowerShell 烟雾测试（非单元测试）
├── AGENTS.md               # 本文件
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json            # 项目引用（指向下面两个）
├── tsconfig.app.json        # 前端 TS 配置（src/）
└── tsconfig.node.json       # Node/Vite TS 配置（vite.config.ts）
```

禁止随意创建新的顶层目录，新增文件放入对应子目录。

---

## 新增功能模式

### 新增页面

1. 创建 `src/pages/NewPage.tsx`
2. 在 `src/App.tsx` 添加 `<Route>` 
3. 在 `src/components/Sidebar.tsx` 的 `navItems` 数组添加导航项

### 新增 IPC 能力

1. `electron/main.cjs`：添加 `ipcMain.handle('channel:name', handler)`
2. `electron/preload.cjs`：在 `electronAPI` 对象中暴露方法
3. `src/types/index.ts`：在 `ElectronAPI` 接口中添加类型声明

---

## 准则一：Ponytail（懒惰高级开发者模式）

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here.
3. Does the standard library already do this?
4. Does a native platform feature cover it?
5. Does an already-installed dependency solve it?
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

The ladder runs after you understand the problem, not instead of it.

Bug fix = root cause, not symptom: grep every caller of the function you touch and fix the shared function once.

Rules:
- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem.
- Mark intentional simplifications with a `ponytail:` comment naming the ceiling and upgrade path.

Not lazy about: understanding the problem, input validation at trust boundaries, error handling that prevents data loss, security, anything explicitly requested. Non-trivial logic leaves ONE runnable check behind.

---

## 准则二：Karpathy Guidelines（减少 LLM 编码错误的行为准则）

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

### 3. Surgical Changes

**禁止大范围重写。每次修改必须是最小必要 diff。**

1. 修改前先 `Read` 目标文件，理解上下文
2. 用 `Edit`（精确替换）而非 `Write`（整文件覆盖），除非是新建文件
3. 禁止"顺手"改动不相关的代码、注释、格式
4. 禁止未经请求的重构、重命名、文件拆分/合并
5. 每个变更行必须能追溯到用户的请求，无法追溯的行不应存在

违反此准则视为 bug，必须回退。

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

---

## 准则三：完成后自审（Post-Code Review）

每次完成代码生成后，必须立即执行一次 ponytail-review 自审：

1. 对本次生成/修改的所有代码执行 over-engineering 审查
2. 输出格式：`<file>:L<line>: <tag> <what>. <replacement>.`
3. Tags: `delete:` / `stdlib:` / `native:` / `yagni:` / `shrink:`
4. 末尾给出 `net: -<N> lines possible.`（无可删则输出 `Lean already. Ship.`）
5. 如审查发现明确的过度工程，立即修复后再交付

此步骤不可跳过，不可省略。

---

## 准则四：编译验证（Post-Code Build）

每次完成代码编写后，必须执行完整编译：

1. 运行 `npm run electron:build` 完成 TypeScript 编译 + Vite 构建 + Electron 打包
2. 若打包失败，按以下流程处理：
   - 第一步：杀死所有 TsCameraTools 进程
   - 第二步：等待 3 秒后重试 `npm run electron:build`
   - 最多重试 3 次，每次重试前都先杀进程
   - 若仍失败，立即停止并向用户反馈错误信息
3. 最终交付物为 `release/win-unpacked/TsCameraTools.exe`（免安装版）

此步骤不可跳过，不可省略。

---

## Git 工作流

- master 分支已开启保护，禁止直接推送，必须通过 Pull Request 合并
- 禁止对 master 强制推送（force push）
- 分支命名：`feature/`、`fix/`、`refactor/`、`docs/`
- Commit message 格式：`type: description`
- PR 合并前确保 `npm run electron:build` 能正常通过
