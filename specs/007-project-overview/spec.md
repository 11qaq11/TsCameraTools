# TsCameraTools 项目概述 Specification

**Status**: Draft
**Created**: 2026-07-23 · **Updated**: 2026-07-23 (架构调整为 Electron-First)
**Author**: AI Agent

---

## 项目宗旨

TsCameraTools 是面向小米影像开发工程师的**桌面集成开发工具箱**。整合 ADB 设备管理、交互式 Shell 终端、内存分析等多种开发工具，具备充分的可扩展性，方便后续集成新工具模块。

---

## 架构决策

### 运行模式

| 模式 | 定位 | 用户 | 平台 |
|------|------|------|------|
| **Electron 桌面端** | 主力用户应用 | 影像开发工程师 | Windows |
| **Web 管理后台** | 管理员运维面板 | 团队管理员 | 浏览器（服务器部署） |

### 职责划分

```
Electron 桌面端 (Windows)
├── ADB 设备管理（检测、列表、Root、Remount）
├── ADB Shell 终端（xterm.js + spawn）
├── 本地终端（cmd.exe）
├── 内存分析（showmap、dumpsys meminfo、dmabuf-dump）
└── 工具扩展框架

Web 管理后台 (Ubuntu 服务器)
├── 用户管理
├── 操作日志查看
├── 系统配置管理
├── 用户反馈管理（后续）
└── 飞书 OAuth 认证（AuthDebug 开关可跳过）
```

---

## 项目当前状态

### 已实现功能

| 模块 | 状态 | 说明 |
|------|------|------|
| Electron 主进程 ADB | ✅ 已完成 | `electron/main.cjs`：检测、安装、设备列表、Root、Remount、Shell |
| Electron Shell 终端 | ✅ 已完成 | 中文输入、命令历史、搜索、重连 |
| Electron 命令历史 | ✅ 已完成 | 持久化到本地 JSON 文件 |
| Electron/Web 双模式路由 | ✅ 已完成 | MainLayout 检测 electronAPI 分流：Electron 渲染 Devices，Web 渲染 DevicesWeb |
| AuthDebug 认证开关 | ✅ 已完成 | AUTH_DEBUG=true 绕过飞书 OAuth，使用默认调试用户 |
| Web 后端 ADB API | ✅ 已完成 | 转管理后台使用（含 /adb/download 多平台下载链接） |
| Web 后端终端服务 | ✅ 已完成 | node-pty + WebSocket，仅管理员可用 |
| 内存分析 | ✅ 已完成 | 前端解析 + 可视化 |
| UI 框架 | ✅ 已完成 | Light 主题、可折叠侧边导航 |
| 飞书 OAuth | ✅ 已完成 | 登录/回调/会话管理 |
| 数据库 | ✅ 已完成 | PostgreSQL：用户、设备历史、会话 |
| Docker 部署 | ✅ 已完成 | Nginx + App + PostgreSQL |

### 待处理

| 任务 | 优先级 | 说明 |
|------|--------|------|
| Web 用户端代码清理 | ✅ 已完成 | DevicesWeb/LocalTerminal 还原，终端路由移除 |
| 提取 ShellPanel 组件 | 🔴 高 | 从 Devices.tsx 提取为独立终端组件，支持本地 cmd.exe |
| 搭建管理后台页面 | 🟡 中 | 用户管理、日志查看、系统配置 |
| 工具市场/面板 | 🟡 中 | 用户可选择启用的工具列表 |
| 用户反馈功能 | 🟢 低 | 后续迭代 |

---

## User Scenarios

### 普通用户（影像开发工程师）

1. 下载安装 Electron 桌面应用（Windows）
2. 启动应用，系统自动检测本机 ADB，未安装则引导下载
3. 连接 Android 设备，查看设备列表
4. 执行 Root/Remount 操作
5. 打开 ADB Shell 终端，输入调试命令（支持中文）
6. 使用内存分析工具查看设备内存数据
7. 打开本地终端（cmd.exe）执行本地脚本

### 管理员

1. 浏览器打开管理后台 URL，飞书 OAuth 登录
2. 查看用户操作日志、设备使用历史
3. 管理系统配置（ADB 路径、端口等）
4. 查看用户提交的反馈（后续）

---

## Requirements

### Functional Requirements

- **FR-001**: Electron 桌面应用支持 Windows 平台安装运行
- **FR-002**: 自动检测本机 ADB 可用性，不可用时提供下载引导（Google Platform Tools）
- **FR-003**: 列出本机 USB 连接的 Android 设备，显示序列号、型号、状态
- **FR-004**: 提供 `adb root` / `adb remount` 图形化操作
- **FR-005**: 提供基于 xterm.js 的 ADB Shell 交互终端，支持中文输入、命令历史、Ctrl+R 搜索
- **FR-006**: 提供本地命令行终端（Windows cmd.exe）
- **FR-007**: 内存分析：支持 showmap、dumpsys meminfo、dmabuf-dump 数据解析和可视化
- **FR-008**: 工具扩展框架：新增工具只需添加配置项和页面组件
- **FR-009**: 管理后台支持飞书 OAuth 登录，AuthDebug 开关可跳过认证
- **FR-010**: 管理后台支持用户操作日志查询
- **FR-011**: 管理后台支持系统配置管理

### Non-Functional Requirements

- **NFR-001**: 终端输入延迟 < 50ms
- **NFR-002**: ADB 设备列表刷新 < 3 秒
- **NFR-003**: 应用启动时间 < 3 秒
- **NFR-004**: Light 主题文字对比度 ≥ 4.5:1（WCAG AA）
- **NFR-005**: 单元测试覆盖率 ≥ 80%

---

## Key Entities

- **用户**: 飞书企业账号，关联设备使用历史记录
- **设备**: Android 设备，通过 USB-ADB 连接，包含序列号、型号、连接状态
- **终端会话**: 一个 ADB Shell 或本地 Shell 进程的生命周期
- **设备历史**: 用户操作设备的审计记录
- **命令历史**: 用户 Shell 中执行过的命令，持久化到本地文件
- **用户反馈**（后续）: 用户提交的 Bug 报告或功能建议

---

## 已知限制

| 问题 | 影响 | 状态 |
|------|------|------|
| 仅 Windows 平台 | macOS/Linux 用户无法使用 | 设计决策，后续可能扩展 |
| 手动安装分发 | 无自动更新，需手动下载新版本 | 后续加入 electron-updater |
| 终端中文输入 | ADB Shell 中文输入偶有问题 | 持续优化中 |

---

## Dependencies

- **Electron 33+**: 桌面应用框架
- **xterm.js**: 终端模拟
- **node-pty**: PTY 支持（本地终端）
- **child_process.spawn**: ADB 进程管理
- **PostgreSQL 16**: 管理后台数据持久化
- **飞书开放平台**: OAuth 2.0 认证
- **Google Android Platform Tools**: ADB 命令行工具（用户本机安装）

---

## Open Questions

- [ ] Electron 应用分发方式：内部文件共享？网页下载？安装包签名？
- [ ] 管理后台是否需要对公网开放，还是仅内网访问？
- [ ] 用户反馈功能的详细需求（反馈表单字段、通知机制等）

---

*本文档描述项目架构调整后状态（2026-07-23），随项目演进持续更新。*
