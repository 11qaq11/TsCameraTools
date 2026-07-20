# 交接报告 - 2026-07-20

## 一、本次会话完成的工作

### 1. 内存分析功能 Bug 修复

| 问题 | 根因 | 修复方案 |
|------|------|----------|
| 进程添加后没有保留 | ProcessManager初始化只使用PRESET_PROCESSES | 添加customProcesses到Redux，用户添加的进程持久化 |
| 仪表盘没有显示进程pid | pidByName只在采集数据时更新 | 进入Dashboard时主动调用API获取PID |
| 采集没有数据变化 | 前端用Socket.io连/socket.io，后端用WebSocket监听/memory | Dashboard改用原生WebSocket连接/memory路径 |
| 停止采集后数据没有停止 | MemoryPoller.stop()只清除timer，正在执行的tick会继续 | 添加running标志，tick开始和结束时检查 |
| 内存趋势折线图显示每个进程 | TrendChart为每个进程单独绘制 | 改为累加所有进程显示总PSS和总dmabuf |
| meminfo详情页404错误 | fetchShowmap缺少serial参数 | 路由是/showmap/:serial/:pid，添加serial参数 |
| showmap需要root权限报错 | /proc/[pid]/smaps需要root权限 | 检测权限错误，返回needRoot标志，前端显示解决方法 |
| 采集按钮状态没有重置 | 返回进程列表再进入时polling状态未清除 | 进入仪表盘时检查WebSocket状态并重置polling |
| 底部进程数据只显示3个 | slice(0,3)限制 + grid布局无法滚动 | 移除限制，改为横向滚动flex布局 |
| 进程数据挤压趋势图 | flex-1导致趋势图被压缩 | 趋势图固定高度h-[300px]，页面整体纵向滚动 |
| 错误状态闪烁 | 每次刷新先清除error再设置 | 使用ref跟踪，只有状态真正改变时才更新 |
| 进入详情页停止采集 | Dashboard组件被卸载，WebSocket断开 | Dashboard保持挂载，DetailPage用absolute覆盖 |

### 2. UI 改进

| 改进 | 说明 |
|------|------|
| 显示MemAvailable | 勾选/proc/meminfo后显示整机可用内存卡片 |
| 运行中进程置顶 | ProcessManager中running进程排在列表顶部 |
| 动态纵坐标 | DetailPage折线图根据最近20条数据自动调整Y轴范围 |
| showmap权限提示 | 非root设备显示详细的解决方法提示 |

### 3. 新增预设进程

| 进程名 | 别名 | 分类 |
|--------|------|------|
| vendor.qti.camera.provider-service_64 | QCOM_HAL64 | service |

---

## 二、当前项目状态

### 文件结构（本次修改）

```
src/
├── store/memory.ts                    # 添加customProcesses状态和action
├── pages/memory/
│   ├── ProcessManager.tsx             # 进程持久化、运行中置顶
│   ├── Dashboard.tsx                  # WebSocket重构、布局优化、MemAvailable
│   └── DetailPage.tsx                 # showmap错误处理、动态纵坐标
├── components/memory/TrendChart.tsx   # 总占用折线图、动态Y轴
├── pages/MemoryAnalysis.tsx           # Dashboard保持挂载
└── layouts/MainLayout.tsx             # MemoryAnalysis容器添加relative

server/
├── routes/memory.ts                   # showmap权限错误检测
├── services/memory-poller.ts          # running标志修复停止逻辑
└── services/memory-ws.ts             # (未修改，原生WebSocket)
```

### 关键架构决策

1. **WebSocket协议**: 前端使用原生WebSocket连接`/memory`路径，不使用Socket.io
2. **数据持久化**: 用户添加的进程保存在Redux `customProcesses`中
3. **组件保持挂载**: Dashboard在进入detail页面时保持挂载，WebSocket不断开

### 预设进程列表（20个）

| 别名 | 进程名 | 分类 |
|------|--------|------|
| APP | com.android.camera | app |
| GALLERY | com.vivo.gallery | app |
| ALGO | com.vivo.vivo3rdalgoservice | algo |
| CAM0_ALLOC_BUF | cam0_alloc_buf | allocator |
| SERVER | cameraserver | service |
| HALSERVER | camerahalserver | service |
| VIVOSERVER | vivocameraserver | service |
| QTI_PROVIDER | vendor.qti.camera.provider | service |
| QCOM_HAL64 | vendor.qti.camera.provider-service_64 | service |
| SHIM | camx.shimserver | service |
| SVM | camxservicemanager | service |
| CORE | camxcore | service |
| HAL27 | vendor.camera.provider@2.7 | service |
| AIDL27 | android.hardware.camera.provider@2.7 | service |
| CODEC | media.codec | service |
| EXTRACTOR | media.extractor | service |
| MEDIA | mediaserver | service |
| SF | surfaceflinger | service |
| ZYGOTE | zygote64 | kernel |
| ALLOC_BUF | alloc_buf | allocator |

---

## 三、已知限制

1. **showmap需要root权限**: 设备未root时无法获取进程映射详情
2. **动态进程PID**: `dynamic: true`的进程每次采集都会重新解析PID
3. **数据不持久化**: 采集的内存数据仅在Redux store中，刷新页面丢失

---

## 四、测试验证

- 构建验证: `npm run web:build` 通过
- 单元测试: `npm run test:all` 192个测试全部通过
- 代码检查: `npm run lint` 通过

---

## 五、Git 状态

- 分支: `master`
- 状态: 与origin同步
- 最近提交: `f9b56c8 fix: keep Dashboard mounted when entering detail page to maintain data collection`
