# UI 重设计与终端升级 Specification

**Status**: Draft
**Created**: 2026-07-07
**Author**: AI Agent

## Overview

将 TsCameraTools 的前端界面从当前的深色 OLED 主题重设计为简约专业的 Light 主题，同时将 ADB Shell 终端从自实现的 xterm.js 本地回显方案升级为集成 ttyd（https://github.com/tsl0922/ttyd）开源终端项目，提升终端体验的稳定性和功能性。

## User Scenarios & Testing

### Primary User Story

作为影像开发工程师，我需要一个界面清爽、导航清晰的开发工具箱，左侧有可扩展的导航栏方便后续集成各类开发工具，并且 ADB Shell 终端需要具备完整的终端功能（包括中文输入、文件传输、Sixel 图像输出等），以便高效地进行设备调试工作。

### Acceptance Scenarios

1. **Given** 用户登录后进入主页，**When** 页面加载完成，**Then** 左侧显示导航栏（包含 Logo、工具列表、版本号），右侧显示当前工具内容区，整体为 Light 主题
2. **Given** 导航栏已显示，**When** 用户点击某个工具菜单项，**Then** 右侧内容区切换到对应工具页面，导航栏高亮当前选中项
3. **Given** 用户在设备管理页面，**When** 点击设备的 "Connect" 按钮，**Then** 打开基于 ttyd 的终端窗口，支持完整的终端交互功能
4. **Given** 终端已打开，**When** 用户输入中文命令，**Then** 终端正确处理 IME 输入并显示中文字符
5. **Given** 导航栏处于展开状态，**When** 用户点击折叠按钮，**Then** 导航栏收缩为仅显示图标的窄栏，内容区自动扩展

### Edge Cases

- 导航栏折叠状态下，工具名称通过 tooltip 显示
- ttyd 进程异常退出时，前端显示重连提示
- 窗口 resize 时终端自适应调整尺寸

## Requirements

### Functional Requirements

- **FR-001**: 左侧导航栏支持展开/折叠两种状态，展开宽度 240px，折叠宽度 64px
- **FR-002**: 导航栏包含可配置的工具菜单列表（数组配置），支持图标+文字+路径
- **FR-003**: 导航栏底部显示应用版本号和用户信息
- **FR-004**: 整体界面采用 Light 主题，背景色 #F8FAFC，主色调 #2563EB（蓝色）
- **FR-005**: ADB Shell 终端集成 ttyd，替换当前自实现的 xterm.js 本地回显方案
- **FR-006**: 终端支持 ttyd 的全部功能：CJK/IME 输入、ZMODEM 文件传输、Sixel 图像输出
- **FR-007**: 设备连接页保留设备列表、Root、Remount 功能，Connect 按钮打开 ttyd 终端
- **FR-008**: 导航栏支持后续扩展，新增工具只需在配置数组中添加一项

### Non-Functional Requirements

- **NFR-001**: 页面首屏加载时间 < 2 秒
- **NFR-002**: 终端输入延迟 < 50ms
- **NFR-003**: Light 主题文字对比度 >= 4.5:1（WCAG AA）
- **NFR-004**: 导航栏折叠/展开动画时长 200-300ms
- **NFR-005**: 响应式布局支持 1024px / 1280px / 1440px 三个断点

### Out of Scope

- 暗色主题（后续版本迭代）
- 终端多标签页功能（ttyd 原生支持，但本期不实现）
- 终端录屏/回放功能
- 移动端适配

## Success Criteria

- Light 主题界面在 1440px 分辨率下视觉一致性评分 >= 90%
- ttyd 终端可正常执行 adb shell 命令，支持中文输入
- 导航栏可扩展性验证：添加新工具菜单项 < 5 行代码改动
- 所有现有功能（设备检测、Root、Remount、飞书登录）正常工作

## Key Entities

- **NavItem**: 导航菜单项，包含 id、label、icon、path、children
- **TtydSession**: ttyd 终端会话，包含 serial、url、status

## Assumptions

- ttyd 可在 Windows 环境下通过预编译二进制文件运行（已验证：GitHub Releases 提供 Windows x64 二进制）
- ttyd 通过 iframe 嵌入 React 应用，后端 child_process.spawn 启动 ttyd 监听独立端口
- 当前的 Express + Socket.io 后端架构可与 ttyd 共存（ttyd 监听不同端口）
- 用户浏览器支持 WebGL2（ttyd 依赖，现代浏览器均支持）
- ttyd 二进制文件随项目打包到 `bin/ttyd/` 目录，用户无需额外安装

## Dependencies

- **ttyd** (https://github.com/tsl0922/ttyd): v1.7.7+，Windows x64 预编译二进制，打包到 `bin/ttyd/`
- **xterm.js**: ttyd 内置使用，无需额外安装
- **lucide-react**: 图标库，已集成
- **Tailwind CSS v4**: 样式框架，已集成
- **Plus Jakarta Sans**: Google Fonts，Light 主题字体

## Open Questions

- [RESOLVED] ttyd 集成方式：通过 iframe 嵌入 React 应用，后端 child_process 启动 ttyd 进程
- [RESOLVED] ttyd 二进制分发：随项目打包到 `bin/ttyd/` 目录，用户无需额外安装
