# 项目开发规范宪法

## 核心原则

1. **代码质量**: 代码必须清晰、可维护、可测试
2. **安全性**: 保护用户数据和系统安全
3. **性能**: 优化响应速度和资源使用
4. **用户体验**: 提供直观、一致的交互体验

## 技术决策

### 前端框架
- 决策: React 19 + TypeScript
- 理由: 类型安全、组件化、生态系统成熟
- 替代方案: Vue.js (未采用，团队更熟悉 React)

### 状态管理
- 决策: Redux Toolkit
- 理由: 可预测的状态管理、DevTools 支持
- 替代方案: Zustand (未采用，功能较简单)

### 终端模拟
- 决策: xterm.js
- 理由: 功能完整、性能好、社区活跃
- 替代方案: 自定义终端 (未采用，开发成本高)

### 构建工具
- 决策: Vite 8
- 理由: 快速开发、原生 ESM 支持
- 替代方案: Webpack (未采用，配置复杂)

### CSS 框架
- 决策: Tailwind CSS 4
- 理由: 实用优先、易于维护、体积小
- 替代方案: CSS Modules (未采用，开发效率低)

## 代码约定

### 文件命名
- 组件: PascalCase (如 DeviceCard.tsx)
- 工具: camelCase (如 auth.ts)
- 常量: UPPER_SNAKE_CASE
- 类型: PascalCase + .ts 后缀
- 测试: xxx.test.ts(x)

### 目录结构
- 按功能模块组织
- 共用组件放 components/
- 页面组件放 pages/
- 工具函数放 utils/

### 导入顺序
1. React 相关
2. 第三方库
3. 项目组件
4. 工具函数
5. 类型定义
6. 样式文件

## 质量门禁

### 代码审查
- 所有 PR 需要审查
- 审查通过后合并
- 审查关注点: 安全性、性能、可维护性

### 测试要求
- 单元测试覆盖率 80%+
- 组件测试覆盖主要交互
- E2E 测试覆盖核心流程

### 构建验证
- TypeScript 编译通过
- Lint 检查通过 (oxlint)
- 测试全部通过

## 安全规范

### 敏感信息
- 不提交 .env 文件
- 使用环境变量存储密钥
- Token 不暴露到前端日志

### 输入验证
- 验证所有用户输入
- 防止命令注入
- 防止 XSS 攻击

### 认证授权
- 使用飞书 OAuth 2.0
- JWT Token 验证
- 会话管理

## Git 工作流

### 分支命名
- feature/xxx - 新功能
- fix/xxx - 修复 bug
- refactor/xxx - 重构
- docs/xxx - 文档更新

### Commit 格式
```
<type>: <description>
```

类型:
- feat: 新功能
- fix: 修复
- refactor: 重构
- docs: 文档
- test: 测试
- chore: 构建/工具

### PR 流程
1. 创建功能分支
2. 开发并提交
3. 创建 PR
4. 代码审查
5. 合并到 master
