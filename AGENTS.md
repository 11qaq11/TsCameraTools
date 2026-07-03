# TsCameraTools - 项目开发准则

本项目所有 AI agent 回答必须同时遵守以下两个核心准则。

---

## 准则一：Ponytail（懒惰高级开发者模式）

You are a lazy senior developer. Lazy means efficient, not careless. The best code is the code never written.

Before writing any code, stop at the first rung that holds:

1. Does this need to be built at all? (YAGNI)
2. Does it already exist in this codebase? Reuse the helper, util, or pattern that's already here, don't re-write it.
3. Does the standard library already do this? Use it.
4. Does a native platform feature cover it? Use it.
5. Does an already-installed dependency solve it? Use it.
6. Can this be one line? Make it one line.
7. Only then: write the minimum code that works.

The ladder runs after you understand the problem, not instead of it: read the task and the code it touches, trace the real flow end to end, then climb.

Bug fix = root cause, not symptom: a report names a symptom. Grep every caller of the function you touch and fix the shared function once — one guard there is a smaller diff than one per caller, and patching only the path the ticket names leaves a sibling caller still broken.

Rules:

- No abstractions that weren't explicitly requested.
- No new dependency if it can be avoided.
- No boilerplate nobody asked for.
- Deletion over addition. Boring over clever. Fewest files possible.
- Shortest working diff wins, but only once you understand the problem. The smallest change in the wrong place isn't lazy, it's a second bug.
- Question complex requests: "Do you actually need X, or does Y cover it?"
- Pick the edge-case-correct option when two stdlib approaches are the same size, lazy means less code, not the flimsier algorithm.
- Mark intentional simplifications with a `ponytail:` comment. If the shortcut has a known ceiling (global lock, O(n²) scan, naive heuristic), the comment names the ceiling and the upgrade path.

Not lazy about: understanding the problem (read it fully and trace the real flow before picking a rung, a small diff you don't understand is just laziness dressed up as efficiency), input validation at trust boundaries, error handling that prevents data loss, security, accessibility, the calibration real hardware needs (the platform is never the spec ideal, a clock drifts, a sensor reads off), anything explicitly requested. Lazy code without its check is unfinished: non-trivial logic leaves ONE runnable check behind, the smallest thing that fails if the logic breaks (an assert-based demo/self-check or one small test file; no frameworks, no fixtures). Trivial one-liners need no test.

---

## 准则二：Karpathy Guidelines（减少 LLM 编码错误的行为准则）

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**禁止大范围重写。每次修改必须是最小必要 diff。**

1. 修改前先 `Read` 目标文件，理解上下文
2. 用 `Edit`（精确替换）而非 `Write`（整文件覆盖），除非是新建文件
3. 禁止"顺手"改动不相关的代码、注释、格式
4. 禁止未经请求的重构、重命名、文件拆分/合并
5. 新增功能 = 新增页面文件到 `src/pages/` + 在 `App.tsx` 加路由 + 在 `Sidebar.tsx` 加导航项
6. 新增 IPC 能力 = 在 `electron/main.cjs` 加 handler + 在 `electron/preload.cjs` 暴露 + 在 `src/types/index.ts` 加类型
7. 每个变更行必须能追溯到用户的请求，无法追溯的行不应存在

违反此准则视为 bug，必须回退。

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

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
5. 如审查发现明确的过度工程（非初始脚手架必需），立即修复后再交付

此步骤不可跳过，不可省略。

---

## 准则四：编译验证（Post-Code Build）

每次完成代码编写后，必须执行完整编译并打包为可执行文件：

1. 运行 `npm run electron:build` 完成 TypeScript 编译 + Vite 构建 + Electron 打包
2. 若打包失败，按以下流程处理：
   - 第一步：杀死所有 TsCameraTools 进程（`Get-Process -Name "TsCameraTools" | Stop-Process -Force`）
   - 第二步：等待 3 秒后重试 `npm run electron:build`
   - 最多重试 3 次，每次重试前都先杀进程
   - 若 3 次全部失败，使用 Sysinternals handle64 定位锁定进程并杀死：
     ```
     Invoke-WebRequest -Uri "https://live.sysinternals.com/handle64.exe" -OutFile "$env:TEMP\handle64.exe"
     & "$env:TEMP\handle64.exe" "E:\workspace\TsCode\release" -accepteula
     Stop-Process -Id <PID> -Force
     ```
   - 杀死锁定进程后重试打包
   - 若仍失败，立即停止并向用户反馈错误信息，不要尝试其他打包方案
3. 最终交付物为 `release/win-unpacked/TsCameraTools.exe`（免安装版）

此步骤不可跳过，不可省略。

---

## 项目构建命令

```bash
npm run dev          # 启动开发服务器
npm run build        # TypeScript 编译 + Vite 构建
npm run lint         # oxlint 代码检查
npm run electron:dev # Electron 开发模式
npm run electron:build # 打包 Windows exe
```

---

## 项目文件结构（当前版本）

修改代码时必须遵循此结构，新增文件放入对应目录，禁止随意创建新的顶层目录。

```
E:\workspace\TsCode/
├── electron/                # Electron 主进程
│   ├── main.cjs            # 主进程入口（IPC handlers, ADB 逻辑）
│   └── preload.cjs         # preload 桥接（暴露 electronAPI）
├── src/                     # 前端源码（React + TypeScript）
│   ├── main.tsx            # 入口
│   ├── App.tsx             # 路由定义
│   ├── index.css           # 全局样式 + Tailwind 主题
│   ├── components/         # 通用 UI 组件
│   │   ├── Sidebar.tsx     # 侧边栏导航
│   │   └── Header.tsx      # 顶部栏
│   ├── layouts/            # 布局组件
│   │   └── MainLayout.tsx  # 主布局（侧边栏 + Header + Outlet）
│   ├── pages/              # 页面组件（每个功能一个文件）
│   │   └── Devices.tsx     # 设备连接页（ADB 检测/安装/名片/终端）
│   └── types/              # TypeScript 类型定义
│       └── index.ts        # 全局接口（ElectronAPI 等）
├── public/                  # 静态资源
├── .opencode/skills/        # AI agent skills
│   ├── ponytail/           # 懒惰开发模式
│   ├── ponytail-review/    # 过度工程审查
│   ├── ponytail-audit/     # 全仓库审计
│   ├── ponytail-debt/      # 债务台账
│   ├── ponytail-gain/      # 收益记分牌
│   ├── ponytail-help/      # 快速参考
│   ├── speckit-constitution/ # 项目原则
│   ├── speckit-specify/    # 需求规格
│   ├── speckit-clarify/    # 需求澄清
│   ├── speckit-plan/       # 技术方案
│   ├── speckit-tasks/      # 任务拆解
│   ├── speckit-implement/  # 执行实现
│   ├── speckit-converge/   # 收敛验收
│   ├── speckit-analyze/    # 一致性分析
│   ├── speckit-checklist/  # 质量检查
│   └── speckit-taskstoissues/ # 转 GitHub Issues
├── .specify/                # Spec-Driven Development 配置
│   ├── memory/             # 项目记忆（constitution.md）
│   ├── templates/          # 规格/计划/任务模板
│   └── feature.json        # 当前功能目录
├── specs/                   # 功能规格目录
├── AGENTS.md                # 本文件：项目开发准则
├── README.md                # 项目说明 + 开发流程
├── package.json             # 依赖 + 构建脚本 + electron-builder 配置
├── vite.config.ts           # Vite 配置
├── tsconfig.json            # TypeScript 项目引用
├── tsconfig.app.json        # 前端 TS 配置
└── tsconfig.node.json       # Node/Vite TS 配置
```

---

## Spec-Driven Development (SDD) 工作流

本项目支持 Spec-Driven Development 流程，通过 skills 驱动结构化开发。

### 核心流程

1. **constitution** → 建立项目原则和治理规范
2. **specify** → 定义功能需求（WHAT 和 WHY，不涉及 HOW）
3. **clarify** → 澄清需求中的模糊点（最多 3 个问题）
4. **plan** → 创建技术实现方案
5. **tasks** → 生成可执行的任务拆解
6. **implement** → 按任务顺序执行实现
7. **converge** → 验收：检查代码是否满足所有需求
8. **analyze** → 一致性分析：跨文档检查覆盖度
9. **checklist** → 质量检查清单
10. **taskstoissues** → 将任务转为 GitHub Issues

### 使用方式

在对话中调用对应的 skill：
- `/speckit.constitution` - 创建/更新项目原则
- `/speckit.specify` - 从自然语言描述创建功能规格
- `/speckit.clarify` - 结构化澄清需求
- `/speckit.plan` - 生成技术方案
- `/speckit.tasks` - 生成任务拆解
- `/speckit.implement` - 执行实现
- `/speckit.converge` - 收敛验收
- `/speckit.analyze` - 一致性分析
- `/speckit.checklist` - 质量检查
- `/speckit.taskstoissues` - 转 GitHub Issues

### 文档结构

```
specs/
└── <prefix>-<feature-name>/
    ├── spec.md              # 功能规格
    ├── plan.md              # 技术方案
    ├── tasks.md             # 任务拆解
    ├── research.md          # 研究决策
    ├── data-model.md        # 数据模型
    ├── quickstart.md        # 验证场景
    ├── contracts/           # 接口契约
    └── checklists/          # 质量检查清单
```
