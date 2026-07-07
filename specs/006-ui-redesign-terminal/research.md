# Research Decisions

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07

## R1: 终端组件选型 — ttyd vs 自实现

### Decision

集成 ttyd (https://github.com/tsl0922/ttyd) 替换当前自实现的 xterm.js 本地回显方案。

### Rationale

- **ttyd**：12k stars，成熟稳定，CJK/IME 原生支持，ZMODEM 文件传输，Sixel 图像输出，WebGL2 渲染
- **当前方案**：child_process.spawn pipe 模式 + 本地回显，中文输入需手动处理 composition 事件，无文件传输能力
- ttyd 的前端基于 xterm.js，与项目现有技术栈一致
- MIT 协议，可商用

### Alternatives Considered

| 方案 | Stars | 问题 |
|------|-------|------|
| **ttyd** ✅ | 12k | C 二进制，需随项目打包 |
| Wetty (krishnasrinivas/wetty) | 4k | Node.js，但 SSH-only，不支持本地命令 |
| GoTTY (yudai/gotty) | 18k | Go 二进制，已归档不再维护 |
| 继续优化自实现 | - | 开发成本高，难以达到 ttyd 的功能完整度 |

## R2: ttyd 集成方式 — iframe vs API 代理

### Decision

通过 iframe 嵌入 ttyd 的 Web UI。后端 child_process.spawn 启动 ttyd 进程监听独立端口，前端 iframe src 指向该端口。

### Rationale

- ttyd 是独立的 HTTP/WebSocket 服务器，最自然的集成方式是 iframe
- iframe 隔离性好，ttyd 的 WebSocket 连接不会与 Socket.io 冲突
- ttyd 支持 `--base-path` 参数，可配置子路径
- 无需修改 ttyd 源码，纯黑盒集成

### Alternatives Considered

| 方案 | 问题 |
|------|------|
| **iframe 嵌入** ✅ | 最简单，隔离性好，无需改 ttyd 源码 |
| API 代理（nginx 反向代理） | 需要额外的代理配置，增加部署复杂度 |
| 源码级集成（提取 ttyd 前端） | ttyd 前端是 TypeScript 构建的，但后端是 C，无法纯前端集成 |

## R3: ttyd 二进制打包策略

### Decision

将 ttyd Windows x64 预编译二进制打包到 `bin/ttyd/ttyd.exe`，随 Git 仓库提交。

### Rationale

- ttyd 二进制约 2MB，对仓库大小影响小
- 用户无需额外安装步骤，开箱即用
- Windows 是主要目标平台（影像开发工程师常用）
- 后续可扩展 Linux/macOS 支持

### Alternatives Considered

| 方案 | 问题 |
|------|------|
| **随项目打包** ✅ | 最简单，用户零配置 |
| npm postinstall 下载 | 需要网络，企业环境可能被墙 |
| 用户自行下载 | 增加使用门槛 |
| Docker 部署 | 影像开发环境通常不用 Docker |

## R4: Light 主题设计系统

### Decision

采用 Swiss Modernism 2.0 风格，Light 主题，蓝色主色调。

### Rationale

- 参考 VS Code、JetBrains 等专业 IDE 的 Light 主题
- 蓝色 (#2563EB) 是专业工具常用色，传达信任感
- 高对比度确保长时间使用的可读性

### Design Tokens

```
Primary:      #2563EB (Blue-600)
On Primary:   #FFFFFF
Secondary:    #3B82F6 (Blue-500)
Background:   #F8FAFC (Slate-50)
Foreground:   #0F172A (Slate-900)
Card:         #FFFFFF
Border:       #E2E8F0 (Slate-200)
Muted:        #F1F5F9 (Slate-100)
Muted FG:     #64748B (Slate-500)
Destructive:  #DC2626 (Red-600)
Accent Green: #16A34A (Green-600)
Sidebar BG:   #FFFFFF
Sidebar Hover:#F1F5F9 (Slate-100)
Sidebar Active:#EFF6FF (Blue-50)
```

### Typography

- 主字体：Plus Jakarta Sans (Google Fonts)
- 等宽字体：JetBrains Mono (已集成)

## R5: 导航栏可扩展架构

### Decision

采用数据驱动的导航配置，工具菜单定义为 TypeScript 数组，新增工具只需添加配置项。

### Rationale

- 符合 AGENTS.md 中的 Ponytail 原则：最少代码，最大扩展性
- 配置与渲染分离，新增工具无需修改 Sidebar 组件代码
- 支持分组、图标、路径、badge 等扩展属性

### Configuration Schema

```typescript
interface NavItem {
  id: string
  label: string
  icon: React.ReactNode
  path: string
  group?: string
  badge?: string | number
  children?: NavItem[]
}
```
