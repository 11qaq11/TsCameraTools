# AndroidMemProfiler — Agent 操作手册

本文件为 AI Agent 提供 **android-mem-profiler** 子项目的操作手册。根目录 `AGENTS.md` 描述的是
vibe-coding-cn 文档仓，与本 Electron 工具无关；本工具的一切约定以本文件为准。

---

## 1. 项目定位

实时 Android 相机内存抓取/分析桌面工具（Electron + TypeScript + React 19 + Ant Design 6 + ECharts +
Zustand）。通过 adb 对设备上相机进程链做周期性 `dumpsys meminfo` + `/proc/meminfo_ion` 采集，趋势可视
化并导出 xlsx。**口径对齐内部工具 camera-memory-fetcher（cmf）**，便于交叉验证。

- 设备：MTK V2603A，serial `10AG5Z0DT100085`
- adb 路径：`C:\adb\adb.exe`（**不是** `/d/adb`）
- cmf 安装位置：`/d/zzy/tools/camera-memory-fetcher/windows-x64/`，其 `proclist.txt` 是进程列表的唯一真源

---

## 2. 构建 / 重建指令（核心，勿忘）

### 环境
- Node.js 22+、Python 3.8+（仅 prompts-library 用，本工具不需）、Git
- 依赖已安装：`node_modules/electron`、`node_modules/.bin/electron-builder`、`build/icon.png` 齐备
- **关键 PATH 陷阱**：本机 bash 默认 PATH 不含 node/adb/git，**每条 Bash 命令必须前缀**：
  ```
  export PATH="/d/nodejs:/d/zzy/tools/Git/usr/bin:/d/zzy/tools/Git/cmd:/c/Windows/system32:/c/Windows:/c/Windows/System32/WindowsPowerShell/v1.0:/c/adb"
  ```
  （adb 实际在 `/c/adb`，不是 `/d/adb`）

### 命令（均在 `android-mem-profiler/` 下执行）
| 命令 | 用途 |
|:---|:---|
| `npm run typecheck` | tsc 类型检查（node + web），改代码后必跑 |
| `npm run build` | `electron-vite build`，仅产出 `out/`（主/preload/渲染产物），**不打包 exe** |
| `npm run dist` | **打包可执行文件**：`electron-vite build && electron-builder --win` |

### 产物
- `npm run dist` → `release/AndroidMemProfiler-0.1.0-x64-portable.exe`（portable 单文件，约 100MB）
- 同时产出 `release/win-unpacked/AndroidMemProfiler.exe`（解包版）和 `release/builder-debug.yml`
- electron-builder 配置在 `package.json` 的 `build` 字段：target=`portable`、output=`release`、
  artifactName=`${productName}-${version}-${arch}-portable.${ext}`、afterPack=`scripts/afterPack.js`

### afterPack 钩子（构建慢的根因，非卡死）
`scripts/afterPack.js` 等待企业 EDR（`ztsmedr.exe` / `QMMemScan64.exe`）对新 exe 的扫描结束
（连续 4 次可写探测，间隔 800ms，上限 90s）。`npm run dist` 因此可能耗时数分钟属正常；
看到 `[afterPack] 等待 ... 解锁` 是预期日志，**不要中断**。

### 重建步骤（改完代码后出新 exe）
```bash
export PATH="/d/nodejs:/d/zzy/tools/Git/usr/bin:/d/zzy/tools/Git/cmd:/c/Windows/system32:/c/Windows:/c/Windows/System32/WindowsPowerShell/v1.0:/c/adb"
cd /e/workspace/proj1/android-mem-profiler
npm run typecheck   # 先过类型
npm run dist        # 打包 → release/AndroidMemProfiler-0.1.0-x64-portable.exe
```

---

## 3. 内存口径架构（对齐 cmf，核心约定）

两套口径曾导致与 cmf 数值不一致，现统一为 cmf 口径：

### PSS = dumpsys TOTAL − EGL mtrack
- `dumpsys meminfo <pid>` 的 TOTAL PSS 含图形 `EGL mtrack`（gralloc 分配的 dma-buf 映射）。
- cmf 口径减去 **EGL mtrack**（**只减 EGL，不减 GL mtrack**），避免与 `meminfo_ion` 的图形 ion 计费重复。
- 实现：`src/main/parsers/dumpsys-meminfo.ts` 解析出 `eglMtrackPss`，算 `pssNoEgl = totalPss - eglMtrackPss`。
- `ParsedDumpsys` 同时保留 `totalPss`（raw，DetailPage 分类表用，与 categories 自洽）与 `pssNoEgl`
 （Dashboard 趋势/合计/导出用，对齐 cmf）。

### dmabuf = /proc/meminfo_ion 分配者计费口径
- **弃用** 旧 N 次 `dmabuf_dump {pid}`（映射/fd 口径，跨进程共享缓冲按全量计入 → 跨进程重复）。
  旧口径对 CAMERA3D 的 64KB cameralog 缓冲重复计费（与 CAMERALOG 自分配重复）即源于此。
- 改用 `cat /proc/meminfo_ion` 一次（全局），按 pid 分发 `ionKb`。只记 `ion_alloc` 的进程
  （allocator/hal 等），APP/CAMERA3D 等仅映射/持有的进程不在表中 → 0，天然不与 PSS 跨进程重复。
- 实现：`src/main/parsers/meminfo-ion.ts` 的 `parseMeminfoIon`（drop 前 2 token，每 3 元组
  pid→size_bytes，/1024 转 KB），与 cmf 逐行同款。`DmabufPoint = { pid, ionKb }`。

### 总占用 = pssNoEgl + ion（可加，无重叠）
PSS 已剔图形 mtrack，ion 为分配计费不跨进程重复 → 二者无图形缓冲重叠，总占用可加。

### 设备验证基线（MTK V2603A，idle 态同瞬时）
| 进程(cmf名) | totalPss | EGL | pssNoEgl | ion | cmf 对应 |
|:---|---:|---:|---:|---:|:---|
| APP | 229119 | 0 | 229119 | 0 | APP-PSS∈[216602,290101], DMABUF=0 ✓ |
| CAMERA3D | 92148 | 32 | 92116 | 0 | CAMERA3D-DMABUF=0 ✓ |
| CAMERALOG | 5220 | 3200 | 2020 | 3328 | **ion 3328 = cmf CAMERALOG-DMABUF 3328** ✓ |
| ALLOCATOR_MTK_V2 | 1977 | 0 | 1977 | 272944 | ALLOCATOR_MTK_V2-DMABUF ✓ |

关键证据：CAMERALOG 的 ion=3328 与 cmf 稳态 DMABUF=3328 完全相等 → 证实 cmf DMABUF 即 meminfo_ion
分配者口径，本工具已对齐。

---

## 4. 进程列表（同步 cmf proclist）

`src/main/process-store.ts` 的 `DEFAULT_PROCESSES` 19 条 catalog，**逐条对齐**
`/d/zzy/tools/camera-memory-fetcher/windows-x64/proclist.txt`：进程名 + 动态标记（`?` 后缀）+ alias
（取 cmf 显示名）。alias 对齐 cmf 使导出 sheet 名 = cmf CSV 列前缀，可直接对照。

- 动态（`dynamic:true`，每 tick 重解 pid）：APP / GALLERY / ALGO / CAM0_ALLOC_BUF
- 静态（boot 服务，解析一次缓存，死亡检测后重解）：SERVER / HALSERVER / VIVOSERVER / CAMERA3D /
  CAMERALOG / VIVOPROVIDER / OSCPROVIDER / PROVIDER / PROVIDER64 / PROVIDER27_64 / PROVIDER_64 /
  ALLOCATOR_MTK / ALLOCATOR_MTK_V2 / ALLOCATOR / GRALLOC
- `STORE_VERSION = 3`；旧 store（version<3，含旧别名或 10 条列表）自动迁移：catalog alias 重置为 cmf
  名，保留用户自增条目。
- 选择键控用 `name`（非 alias），所以改 alias 不影响抓取/导出逻辑。
- MTK 设备上 qcom 条目自然"未运行"置灰；CAM0_ALLOC_BUF 是 kernel 缓冲名，pidof 找不到恒"-"。

### 死亡检测（静态缓存的安全网）
静态进程缓存 pid 后，若该 pid 死亡，`dumpsys meminfo <死pid>` 返回 "No process found"、exit=0 不抛错、
`parseDumpsysMeminfo` 得到空 `categories`。poller 命中 `categories.length===0` → 置 `pid=null` +
`needsResolve=true`，下轮重解新 pid，本帧推 0 值（卡片立即转未运行，避免"运行中+0"假象）。

---

## 5. 导出 xlsx 行为

- `Dashboard.onExport`：导出前若在抓取，**先 `stop()` + `setPolling(false)`**，冻结已采集数据，
  避免导出过程中新样本到达导致各进程时间轴长度不一致。
- 主进程 `src/main/ipc.ts` 用 exceljs 写多 sheet：
  - Sheet1「汇总趋势」：时间 + 各进程 PSS(减EGL) + 合计 PSS + 合计 dmabuf + 总占用(PSS+dmabuf)
  - Sheet2..N 每进程：时间 / PSS(减EGL) / EGL mtrack / RSS / dmabuf 分配
  - 末 sheet「整机meminfo」：/proc/meminfo 字段（受开关控制）
- PSS 列为 cmf 口径 `pssNoEgl`；EGL mtrack 单列保留可还原 raw totalPss。

---

## 6. 代码地图

```
android-mem-profiler/
├── src/
│   ├── shared/types.ts              # ParsedDumpsys(eglMtrackPss/pssNoEgl) / DmabufPoint({pid,ionKb}) / Export*
│   ├── main/
│   │   ├── adb.ts                   # adb 定位(C:\adb\adb.exe) / shell / pidOfFast(防注入正则)
│   │   ├── poller.ts                # 轮询：PID解析屏障 + cat meminfo_ion + dumpsys 并发 + 死亡检测
│   │   ├── ipc.ts                   # IPC + xlsx 导出(exceljs)
│   │   ├── process-store.ts         # 19 条 cmf catalog + v3 迁移
│   │   └── parsers/
│   │       ├── dumpsys-meminfo.ts   # 算 eglMtrackPss / pssNoEgl
│   │       ├── meminfo-ion.ts       # parseMeminfoIon(cmf 同款)
│   │       ├── meminfo.ts           # /proc/meminfo
│   │       └── showmap.ts           # 详情页 showmap
│   ├── preload/index.ts             # API 签名
│   └── renderer/src/
│       ├── store.ts                 # Zustand：pushSamples 按 kind+name 路由
│       └── pages/
│           ├── ProcessManager.tsx   # 进程选择（自动匹配运行中、?动态标、恢复默认）
│           ├── Dashboard.tsx        # 抓取面板（PSS减EGL + dmabuf 趋势/合计/导出；选中合计卡尾部显示总占用）
│           └── DetailPage.tsx       # showmap 明细（用 raw totalPss，与分类表自洽）
├── scripts/afterPack.js             # EDR 扫描等待钩子
├── build/icon.png                   # 应用图标
├── release/                         # electron-builder 产物（portable exe）
└── out/                             # electron-vite build 产物（dist 的前置）
```

---

## 7. 约束（沿用根 AGENTS.md + 本工具特有）

- **不推送远程**：实现/打包后仅本地 commit，用户验证通过后再 `git push`。
- **不硬编码密钥**：vivo 凭证（72190609/...）仅用于一次性 git clone，临时克隆已删，**禁止写入任何项目文件**。
- **不引入 LGPL/不可商用包**（如 Qt）。
- 不改 `.github/workflows/`、`LICENSE`、`CODE_OF_CONDUCT.md`、`.env*`。
- 进程名入 adb shell 前经 `isValidProcessName`（`/^[A-Za-z0-9._@-]+$/`）校验，防命令注入。
- Commit 风格：Conventional Commits `feat|fix|docs|chore|refactor|test: scope - summary`，结尾加
  `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`。
- `out/`、`release/`、`node_modules/` 已 gitignore，提交只含源码。
