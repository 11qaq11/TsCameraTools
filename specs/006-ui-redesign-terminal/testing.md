# Testing Design

**Feature**: specs/006-ui-redesign-terminal
**Created**: 2026-07-07

## 测试框架

- **Runner**: Vitest 4.x
- **DOM**: jsdom（前端测试）
- **Node**: node 环境（服务端测试）
- **React Testing Library**: @testing-library/react + @testing-library/jest-dom
- **API 测试**: supertest（Express 路由测试）
- **Mock**: vi.fn() / vi.mock()
- **Coverage**: v8 provider, thresholds 80%

## 测试配置

### 前端测试配置（现有）

文件：`vitest.config.ts`（保持不变）

```typescript
test: {
  environment: 'jsdom',
  include: ['src/**/*.{test,spec}.{ts,tsx}'],
}
```

### 服务端测试配置（新增）

文件：`vitest.server.config.ts`

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['server/**/*.{test,spec}.{ts,tsx}'],
  },
})
```

### package.json 新增脚本

```json
{
  "scripts": {
    "test": "vitest run",
    "test:server": "vitest run --config vitest.server.config.ts",
    "test:all": "vitest run && vitest run --config vitest.server.config.ts",
    "test:coverage": "vitest run --coverage && vitest run --config vitest.server.config.ts --coverage"
  }
}
```

## 测试文件清单

### T1: `src/config/navigation.test.ts` — 导航配置 (P0)

```typescript
describe('navigation config', () => {
  it('应该包含至少一个导航项')
  it('每个导航项的 id 应该唯一')
  it('每个导航项的 path 应该唯一')
  it('每个导航项应该有 label 和 icon')
  it('path 应该以 / 开头')
  it('group 应该是预定义的分组之一')
})
```

覆盖：FR-002, FR-008

### T2: `src/components/Sidebar.test.tsx` — 导航栏组件 (P0)

```typescript
describe('Sidebar', () => {
  describe('渲染', () => {
    it('应该渲染 Logo 和应用名称')
    it('应该渲染所有导航菜单项')
    it('应该渲染版本号')
    it('应该渲染折叠/展开按钮')
  })

  describe('展开/折叠', () => {
    it('默认应该展开（宽度 240px）')
    it('点击折叠按钮应该收缩到 64px')
    it('折叠状态下应该只显示图标，不显示文字')
    it('折叠状态下鼠标悬停应该显示 tooltip')
    it('再次点击应该展开')
    it('展开/折叠应该有 200-300ms 过渡动画')
  })

  describe('导航高亮', () => {
    it('当前路径对应的菜单项应该高亮')
    it('非当前路径的菜单项不应该高亮')
    it('切换路径后高亮应该更新')
  })

  describe('菜单点击', () => {
    it('点击菜单项应该触发路由跳转')
    it('点击当前已选中的菜单项应该无变化')
  })
})
```

覆盖：FR-001, FR-002, FR-003, FR-008

### T3: `src/components/terminal/TtydTerminal.test.tsx` — 终端组件 (P0)

```typescript
describe('TtydTerminal', () => {
  describe('渲染', () => {
    it('应该渲染 iframe 元素')
    it('iframe src 应该指向正确的 ttyd URL')
    it('加载中应该显示 loading 状态')
    it('加载完成应该隐藏 loading')
  })

  describe('错误状态', () => {
    it('ttyd 启动失败应该显示错误信息')
    it('ttyd 进程退出应该显示断开提示')
    it('网络错误应该显示重试按钮')
  })

  describe('生命周期', () => {
    it('组件卸载时应该调用 stop API 清理 ttyd 进程')
    it('serial 变化时应该重新启动 ttyd')
  })

  describe('props', () => {
    it('接收 serial prop 并传递给 API')
    it('接收 onClose prop 并在关闭时调用')
  })
})
```

覆盖：FR-005, FR-006

### T4: `server/services/ttyd.test.ts` — ttyd 服务 (P1)

```typescript
describe('TtydService', () => {
  describe('checkBinary', () => {
    it('二进制存在时应该返回 available: true')
    it('二进制不存在时应该返回 available: false')
    it('应该返回正确的版本号')
  })

  describe('startSession', () => {
    it('应该分配可用端口')
    it('应该 spawn ttyd 进程')
    it('应该返回 sessionId 和 port')
    it('端口全部占用时应该返回错误')
    it('二进制不存在时应该返回错误')
  })

  describe('stopSession', () => {
    it('应该终止对应的 ttyd 进程')
    it('应该清理会话记录')
    it('不存在的 sessionId 应该返回 false')
  })

  describe('getStatus', () => {
    it('starting 状态应该返回 starting')
    it('running 状态应该返回 running')
    it('已停止的会话应该返回 stopped')
  })

  describe('findAvailablePort', () => {
    it('应该从起始端口开始查找')
    it('占用的端口应该跳过')
    it('无可用端口时应该返回 null')
  })
})
```

覆盖：FR-005

### T5: `server/routes/ttyd.test.ts` — ttyd API 路由 (P1)

```typescript
describe('Ttyd API Routes', () => {
  describe('POST /api/ttyd/start', () => {
    it('正常请求应该返回 200 + sessionId + port')
    it('缺少 serial 应该返回 400')
    it('ttyd 启动失败应该返回 500')
  })

  describe('POST /api/ttyd/stop', () => {
    it('正常请求应该返回 200')
    it('不存在的 sessionId 应该返回 404')
  })

  describe('GET /api/ttyd/status/:sessionId', () => {
    it('存在会话应该返回状态')
    it('不存在会话应该返回 404')
  })

  describe('GET /api/ttyd/check', () => {
    it('ttyd 可用应该返回 available: true')
    it('ttyd 不可用应该返回 available: false')
  })
})
```

覆盖：FR-005

### T6: `src/pages/DevicesWeb.test.tsx` — 设备页面 (P1)

```typescript
describe('DevicesWeb', () => {
  describe('设备列表', () => {
    it('应该渲染设备卡片列表')
    it('无设备时应该显示空状态提示')
    it('点击刷新按钮应该重新获取设备列表')
  })

  describe('设备卡片', () => {
    it('应该显示设备型号和序列号')
    it('在线设备应该显示绿色状态')
    it('离线设备应该显示红色状态')
    it('应该显示 Root 和 Remount 按钮')
    it('在线设备应该显示 Connect 按钮')
    it('离线设备的 Connect 按钮应该禁用')
  })

  describe('Connect 流程', () => {
    it('点击 Connect 应该调用 ttyd start API')
    it('ttyd 启动成功应该显示终端组件')
    it('ttyd 启动失败应该显示错误提示')
  })

  describe('断开连接', () => {
    it('点击断开应该调用 ttyd stop API')
    it('断开后应该返回设备列表视图')
  })
})
```

覆盖：FR-005, FR-007

## 测试运行策略

### 开发阶段

```bash
# 每个 Phase 完成后运行对应测试
npm test -- Sidebar       # Phase 2 完成后
npm test -- TtydTerminal  # Phase 3 完成后
npm test -- ttyd          # Phase 3 完成后
```

### 提交前

```bash
# 全量测试 + 覆盖率
npm test -- --coverage
```

### CI/CD

```bash
# 构建 + 测试 + lint
npm run web:build && npm test && npm run lint
```

## Mock 策略

### ttyd 二进制 Mock

```typescript
vi.mock('child_process', () => ({
  spawn: vi.fn(() => ({
    pid: 12345,
    stdout: { on: vi.fn() },
    stderr: { on: vi.fn() },
    on: vi.fn(),
    kill: vi.fn(),
  }))
}))
```

### fetch Mock

```typescript
vi.mock('../utils/auth', () => ({
  fetchWithAuth: vi.fn()
}))
```

### Socket.io Mock

```typescript
vi.mock('../hooks/useSocket', () => ({
  useSocket: () => ({
    socket: { on: vi.fn(), off: vi.fn(), emit: vi.fn() },
    emit: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  })
}))
```
