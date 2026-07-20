# 交接报告 - 2026-07-16

## 一、本次会话完成的工作

### 1. 内存分析功能集成
- 完成从 temp_resources 中的 Android 内存分析工具到 TsCameraTools 的完整移植
- 新增 12 个任务，包含前端页面、后端路由、解析器、Redux 状态管理
- 所有测试通过（192 个测试），构建成功

### 2. 工具状态管理
- 扩展 Redux Store：添加 `recentTools`、`activeTool`、`toolSnapshots`
- 创建 ToolBar 组件：显示最近使用的工具
- 实现状态保存/恢复：设备连接和内存分析页面支持状态快照

### 3. 终端状态保持
- 修改 MainLayout：使用 CSS `hidden` 类显示/隐藏页面，而非卸载组件
- 终端 WebSocket 连接在后台保持活跃

### 4. Bug 修复
- ADB 路径解析问题（`config.ts` 中 `__dirname` 路径修正）
- node-pty `AttachConsole` 错误抑制（Windows + Node.js v24 兼容性）
- 侧边栏导航现在正确更新最近使用工具列表

---

## 二、待处理需求（用户明确要求）

### 需求 1：导航栏工具排序逻辑修改
**当前行为**：最近使用的工具移到第一位
**期望行为**：按照打开的先后顺序排序，不改变顺序

**涉及文件**：
- `src/store/reducers/ui.ts` - `switchTool` action
- `src/components/ToolBar.tsx` - 显示逻辑

**修改思路**：
- `switchTool` 中不再将工具移到最前，只在工具不存在时追加到列表
- 或者直接移除排序逻辑，保持初始顺序

---

### 需求 2：侧边栏字体颜色修改
**当前行为**：使用 CSS 变量定义的颜色
**期望行为**：
- 未选中的工具：黑色字体
- 选中的工具：红色字体

**涉及文件**：
- `src/components/Sidebar.tsx` - 导航项样式

**修改思路**：
```tsx
// 当前样式
isActive
  ? 'bg-[var(--color-sidebar-active)] text-[var(--color-text-sidebar-active)]'
  : 'text-[var(--color-text-sidebar)] hover:...'

// 修改为
isActive
  ? 'bg-[var(--color-sidebar-active)] text-red-600'
  : 'text-black hover:...'
```

---

### 需求 3：终端历史内容丢失问题
**问题描述**：
1. ADB shell 终端切换功能后，顶部两行历史内容消失
2. 本地终端切换工具后内容完全清空

**可能原因**：
- xterm.js 在组件从 `hidden` 变为可见时，可能触发了重新渲染或滚动重置
- 终端缓冲区在组件状态变化时被清空

**涉及文件**：
- `src/components/terminal/XtermTerminal.tsx` - 终端组件
- `src/pages/DevicesWeb.tsx` - 设备连接页面（ADB shell）
- `src/pages/LocalTerminal.tsx` - 本地终端页面

**排查方向**：
1. 检查 xterm.js 的 `open()` 方法是否在组件重新可见时被重复调用
2. 检查 WebSocket 重连逻辑是否清空了终端内容
3. 考虑使用 xterm.js 的 `buffer` API 保存和恢复内容
4. 或者在组件中添加状态标记，避免重新初始化

---

## 三、当前项目状态

### 文件结构（新增/修改）
```
src/
├── components/
│   ├── ToolBar.tsx                    # 新增：最近使用工具栏
│   └── terminal/XtermTerminal.tsx     # 修改：添加 overflow-hidden
├── layouts/MainLayout.tsx             # 修改：集成 ToolBar + CSS hidden
├── pages/
│   ├── DevicesWeb.tsx                 # 修改：状态保存/恢复
│   ├── MemoryAnalysis.tsx             # 新增：内存分析主页面
│   └── memory/                        # 新增：内存分析子页面
│       ├── DeviceSelect.tsx
│       ├── ProcessManager.tsx
│       ├── Dashboard.tsx
│       ├── DetailPage.tsx
│       └── DmabufDetailPage.tsx
├── store/
│   ├── reducers/ui.ts                 # 修改：添加 recentTools/snapshots
│   └── memory.ts                      # 新增：内存分析 Redux slice
├── types/memory.ts                    # 新增：内存分析类型定义
└── components/memory/                 # 新增：内存分析组件
    ├── TrendChart.tsx
    ├── MiniList.tsx
    └── ProcessCard.tsx

server/
├── config.ts                          # 修改：ADB 路径解析修复
├── index.ts                           # 修改：AttachConsole 错误抑制
├── routes/memory.ts                   # 新增：内存分析路由
├── services/
│   ├── memory-poller.ts               # 新增：内存轮询服务
│   └── memory-ws.ts                   # 新增：内存 WebSocket 服务
└── parsers/                           # 新增：内存数据解析器
    ├── dumpsys-meminfo.ts
    ├── meminfo-ion.ts
    ├── meminfo.ts
    ├── dmabuf-dump.ts
    └── showmap.ts
```

### 构建状态
- `npm run web:build` ✓ 通过
- `npm run test:all` ✓ 192 个测试全部通过

### 依赖变更
- 新增：`echarts`、`echarts-for-react`、`exceljs`

---

## 四、技术决策记录

1. **UI 框架**：使用 Tailwind CSS（非 Ant Design）
2. **状态管理**：使用 Redux Toolkit（非 Zustand）
3. **图表库**：使用 ECharts
4. **终端状态保持**：使用 CSS `hidden` 而非卸载组件
5. **内存口径**：对齐 camera-memory-fetcher（PSS 减 EGL mtrack，dmabuf 用分配者口径）

---

## 五、注意事项

1. **MemoryAnalysis 组件较大**：ECharts 打包后约 1.2MB，建议后续考虑代码分割
2. **node-pty 兼容性**：Node.js v24 + Windows 存在 AttachConsole 错误，已通过全局异常处理抑制
3. **终端状态保持**：当前方案使用 CSS hidden，但 xterm.js 可能在某些情况下重置缓冲区，需要进一步调试

---

## 六、下一步建议

1. 优先修复需求 3（终端历史内容丢失），这影响用户体验
2. 然后处理需求 1（导航栏排序）和需求 2（侧边栏颜色）
3. 考虑对 MemoryAnalysis 进行代码分割优化
