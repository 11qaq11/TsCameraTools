# AndroidMemProfiler

实时 Android 相机内存抓取与分析桌面工具。

## 简介

通过 adb 对设备上相机进程链做周期性 `dumpsys meminfo` + `/proc/meminfo_ion` 采集，趋势可视化并导出
xlsx。内存口径对齐内部工具 **camera-memory-fetcher（cmf）**，便于交叉验证。

## 功能特性

- **多进程实时采集**：19 条相机进程 catalog（对齐 cmf `proclist`），自动匹配设备上实际运行的进程
- **双口径无重叠**：PSS（dumpsys TOTAL − EGL mtrack）+ dmabuf（`/proc/meminfo_ion` 分配者计费），可加
- **静态/动态 PID**：boot 服务解析一次缓存；APP/GALLERY 等动态进程每 tick 重解；死亡检测自动恢复
- **趋势可视化**：ECharts 折线 + 数值滚动列表，最新值高亮
- **一键导出 xlsx**：汇总趋势 + 每进程明细 + 整机 meminfo
- **自定义无边框窗口**：JS 驱动拖动（不冻结主线程），adb 轮询移入 worker 线程不阻塞 UI

## 技术栈

| 层 | 选型 |
|:---|:---|
| 框架 | Electron 42 + electron-vite |
| 语言 | TypeScript |
| 渲染 | React 19 + Ant Design 6 + ECharts 6 |
| 状态 | Zustand |
| 导出 | exceljs |
| 打包 | electron-builder（portable / nsis） |

## 目录结构

```
android-mem-profiler/
├── src/
│   ├── shared/types.ts              # 跨进程类型（ParsedDumpsys / DmabufPoint / Export*）
│   ├── main/
│   │   ├── adb.ts                   # adb 定位 / shell / pidOfFast（防注入正则）
│   │   ├── poller.ts                # worker facade：转发消息 + 丢弃迟到样本
│   │   ├── poller-worker.ts         # 轮询 worker：PID 解析 + meminfo_ion + dumpsys 并发 + 死亡检测
│   │   ├── ipc.ts                   # IPC + xlsx 导出（exceljs）
│   │   ├── process-store.ts         # 19 条 cmf catalog + 版本迁移
│   │   ├── index.ts                 # 主进程入口：环境门禁 / 窗口 / 快捷键 / contentTracing
│   │   └── parsers/
│   │       ├── dumpsys-meminfo.ts   # 算 eglMtrackPss / pssNoEgl
│   │       ├── meminfo-ion.ts       # parseMeminfoIon（cmf 同款）
│   │       ├── meminfo.ts           # /proc/meminfo
│   │       └── showmap.ts           # 详情页 showmap 解析
│   ├── preload/index.ts             # contextBridge API 签名
│   └── renderer/src/
│       ├── App.tsx                  # 自定义标题栏（固定不滚动）+ 路由
│       ├── store.ts                 # Zustand：pushSamples 按 kind+name 路由
│       ├── index.css                # 全局重置（100% 高度链）
│       ├── components/MiniList.tsx  # 数值滚动列表
│       └── pages/
│           ├── DeviceSelect.tsx     # 设备选择
│           ├── ProcessManager.tsx   # 进程选择（自动匹配 / ?动态标 / 恢复默认）
│           ├── Dashboard.tsx        # 抓取面板（PSS减EGL + dmabuf 趋势/合计/导出）
│           └── DetailPage.tsx       # showmap 明细（用 raw totalPss，与分类表自洽）
├── scripts/afterPack.js             # EDR 扫描等待钩子（打包期）
├── build/icon.png                   # 应用图标
├── electron.vite.config.ts          # 多入口（index + poller-worker）
└── package.json                     # build 字段：asar:false / target / afterPack
```

## 环境要求

- **Node.js 22+**、Git
- **Android Platform Tools（adb）**：需在 PATH，或位于 `C:\adb\adb.exe`
- **Windows**（USB 驱动检测为 Windows 专有；非 Windows 跳过）
- **Android 设备**：开启 USB 调试；adb shell 需 root（读取 `/proc/meminfo_ion` 需要）

## 构建与运行

```bash
npm install
npm run typecheck   # tsc 类型检查（node + web），改代码后必跑
npm run build       # electron-vite build，仅产出 out/（开发调试用）
npm run dist        # 打包 exe：electron-vite build && electron-builder --win
```

产物：`release/AndroidMemProfiler-0.1.0-x64-portable.exe`

> **企业 EDR 环境注意**：portable 每次启动把 ~250MB 解压到 `%TEMP%` 触发 EDR 全量扫描，可能挂起
> 90s+ 或偶发崩溃。EDR 环境建议改用 **nsis 安装版**：`npx electron-builder --win -c.win.target=nsis`，
> 装到稳定目录后每次启动秒开（EDR 仅在安装时扫描一次）。

## 使用流程

1. 连接 Android 设备（USB 调试），启动工具——自动检测 adb 环境与 USB 驱动，缺一即报错终止
2. 选择设备 → 进程页自动匹配运行中的相机进程，勾选要监控的（MTK 设备上 qcom 条目自然置灰）
3. Dashboard 点「开始抓取」，实时查看 PSS / dmabuf 趋势与合计
4. 点「导出 xlsx」导出——抓取中导出会先停止抓取冻结数据，保证各进程时间轴长度一致
5. 点进程卡进入 DetailPage 查看 showmap 明细

## 内存口径（对齐 cmf，核心约定）

### PSS = dumpsys TOTAL − EGL mtrack

`dumpsys meminfo <pid>` 的 TOTAL PSS 含图形 `EGL mtrack`（gralloc 分配的 dma-buf 映射），与
`meminfo_ion` 的图形 ion 计费重复，故减去 **EGL mtrack**（只减 EGL，不减 GL mtrack）。

### dmabuf = /proc/meminfo_ion 分配者计费

一次 `cat /proc/meminfo_ion` 全局取值，按 pid 分发 `ionKb`。只记 `ion_alloc` 的进程
（allocator/hal 等），APP/CAMERA3D 等仅映射/持有的进程不在表中 → 0，天然不跨进程重复。

### 总占用 = pssNoEgl + ion（可加，无重叠）

PSS 已剔图形 mtrack，ion 为分配计费不跨进程重复 → 二者无图形缓冲重叠，总占用可加。

## 进程 catalog

19 条对齐 cmf `proclist`：

- **动态**（`dynamic:true`，每 tick 重解 pid）：APP / GALLERY / ALGO / CAM0_ALLOC_BUF
- **静态**（boot 服务，解析一次缓存，死亡检测后重解）：SERVER / HALSERVER / VIVOSERVER / CAMERA3D /
  CAMERALOG / 各 PROVIDER / 各 ALLOCATOR / GRALLOC

MTK 设备上 qcom 条目自然「未运行」置灰；CAM0_ALLOC_BUF 是 kernel 缓冲名，`pidof` 找不到恒「-」。

### 死亡检测（静态缓存的安全网）

静态进程缓存 pid 后，若该 pid 死亡，`dumpsys meminfo <死pid>` 返回 `No process found`、exit=0 不抛错、
解析得到空 `categories`。worker 命中 `categories.length===0` → 置 `pid=null` + `needsResolve=true`，
下轮重解新 pid，本帧推 0 值（卡片立即转未运行，避免「运行中+0」假象）。

## 约束

- 进程名入 adb shell 前经 `isValidProcessName`（`/^[A-Za-z0-9._@-]+$/`）校验，防命令注入
- `asar:false`——worker_threads 是独立 Node 实例，无 Electron 的 asar patch，文件必须 loose
- 不引入 LGPL / 不可商用包

## 架构要点

- **worker_threads 剥离 adb 轮询**：主进程每 tick 曾起 ~11-18 个 adb.exe（USB 串行 + Windows spawn
  开销），最长 3079ms 阻塞主进程事件循环，饿死同在主循环的 JS 拖动 `setPosition`（拖动卡顿）。
  将整条 tick 链移入 worker，主进程只做 IPC 转发 + 窗口控制，adb spawn/解析不再争抢主循环。
- **自定义 JS 拖动**：原生标题栏 / `-webkit-app-region:drag` 在 Windows 走同步模态拖动，冻结渲染主
  线程（trace 实测 61.7%）。改由主进程 `screen.getCursorScreenPoint` 轮询 + `setPosition` 驱动窗口
  移动，不进模态循环，数据 tick 与图表正常更新。

更多 Agent 维度的构建/口径细节见 `AGENTS.md`。
