# 技术决策记录

## 2026-07-07: 代码分割策略

### 决策
使用 React.lazy + Suspense 实现路由级别懒加载

### 理由
- 减少初始 bundle 大小
- 提高首屏加载速度
- 按需加载页面组件

### 替代方案
- 动态 import() (已采用)
- Webpack Magic Comments (未采用)

---

## 2026-07-07: 终端实现方案

### 决策
使用 xterm.js + child_process.spawn 实现终端

### 理由
- xterm.js 功能完整
- child_process.spawn 灵活性高
- 支持中文输入

### 替代方案
- node-pty (未采用，需要原生编译)
- 终端模拟器 (未采用，功能受限)

---

## 2026-07-07: 认证方案

### 决策
使用飞书 OAuth 2.0 + JWT

### 理由
- 企业账号统一管理
- JWT 无状态验证
- 安全性高

### 替代方案
- 自建认证系统 (未采用，维护成本高)
- Session 认证 (未采用，需要状态存储)

---

## 2026-07-07: 状态管理方案

### 决策
使用 Redux Toolkit

### 理由
- 可预测的状态管理
- DevTools 支持
- 生态系统成熟

### 替代方案
- Zustand (未采用，功能较简单)
- Context API (未采用，性能问题)

---

## 2026-07-07: CSS 框架选择

### 决策
使用 Tailwind CSS 4

### 理由
- 实用优先，开发效率高
- 易于维护
- 体积小（自动 tree-shaking）

### 替代方案
- CSS Modules (未采用，开发效率低)
- Styled Components (未采用，性能问题)

---

## 2026-07-07: 测试框架选择

### 决策
使用 Vitest + React Testing Library + Playwright

### 理由
- Vitest: 与 Vite 集成好，速度快
- React Testing Library: 测试用户行为
- Playwright: E2E 测试，跨浏览器支持

### 替代方案
- Jest (未采用，配置复杂)
- Cypress (未采用，性能较差)

---

## 2026-07-07: 代码检查工具

### 决策
使用 oxlint

### 理由
- 速度快（Rust 实现）
- 配置简单
- 兼容 ESLint 规则

### 替代方案
- ESLint (未采用，速度慢)
- Biome (未采用，生态不成熟)

---

## 2026-07-07: 运行模式

### 决策
支持 Web 和 Electron 两种运行模式

### 理由
- Web 模式: 易于部署，无需安装
- Electron 模式: 桌面应用，功能完整

### 架构设计
- 前端代码共享
- 后端逻辑分离
- IPC 通信层抽象
