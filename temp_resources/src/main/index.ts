import { app, BrowserWindow, contentTracing, dialog, globalShortcut, shell } from 'electron'
import { join } from 'node:path'
import { registerIpc, setMainWindow } from './ipc'
import { checkAdbEnv, checkUsbDriver } from './adb'
import { readProcesses } from './process-store'
import { stopPoller } from './poller'

// 环境检查失败时的硬终止（用户明确要求：无 adb 或 USB 驱动直接报错终止）
async function guardEnv(): Promise<boolean> {
  const adb = await checkAdbEnv()
  if (!adb.ok) {
    await showErrorAndQuit(
      'ADB 环境不可用',
      `${adb.reason ?? '未找到 adb。'}\n\n请安装 Android Platform Tools，并确保 adb 在 PATH 或位于 C:\\adb\\adb.exe。`
    )
    return false
  }
  const usb = await checkUsbDriver()
  if (!usb.ok) {
    await showErrorAndQuit(
      '未检测到 ADB USB 驱动',
      `${usb.reason ?? '未安装 Android ADB USB 驱动。'}\n\n请安装设备厂商 USB 驱动或 Google USB Driver 后重试。`
    )
    return false
  }
  return true
}

async function showErrorAndQuit(title: string, message: string): Promise<void> {
  await dialog.showMessageBox({ type: 'error', title, message, buttons: ['确定'] })
  app.quit()
}

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 720,
    title: 'Android 内存抓取分析工具',
    autoHideMenuBar: true,
    // 无边框 + titleBarOverlay：隐藏原生标题栏。原生标题栏拖动走 Win32 模态循环
    // (DefWindowProc WM_NCLBUTTONDOWN)，会冻结浏览器 UI 线程 → 无法转发 IPC/compositor
    // 帧请求 → 渲染主线程饿死、窗口内容冻结（contentTracing 实测拖动时 56.7% 主线程被冻，
    // 全部停在 native 等待，零 JS 执行）。改由渲染层 -webkit-app-region:drag 自定义标题栏
    // 在合成器线程驱动拖动，不阻塞主线程；overlay 保留右上角原生最小化/最大化/关闭按钮，
    // 无需自绘窗口控件。height 与渲染层标题栏一致(32px)。
    titleBarStyle: 'hidden',
    titleBarOverlay: { height: 32, color: '#f5f7fa', symbolColor: '#595959' },
    backgroundColor: '#f5f7fa',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  // 开发环境加载 dev server，生产加载打包产物
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(devUrl)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }

  setMainWindow(win)

  // F12 / Ctrl+Shift+I 切换 DevTools（autoHideMenuBar 下默认菜单快捷键不可靠，显式注册）
  globalShortcut.register('F12', () => {
    const w = BrowserWindow.getFocusedWindow() ?? win
    if (w.webContents.isDevToolsOpened()) w.webContents.closeDevTools()
    else w.webContents.openDevTools({ mode: 'detach' })
  })
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    const w = BrowserWindow.getFocusedWindow() ?? win
    if (w.webContents.isDevToolsOpened()) w.webContents.closeDevTools()
    else w.webContents.openDevTools({ mode: 'detach' })
  })

  // Ctrl+Shift+T：用 contentTracing 录制干净 trace（绕开 DevTools，无协议消息流污染）。
  // 按一次开始录，再按一次停止并自动保存 .json 到桌面。重点抓渲染主线程的
  // blink/v8/devtools.timeline/调度 类别（含 React commit、rAF、layout）。
  let tracing = false
  globalShortcut.register('CommandOrControl+Shift+T', async () => {
    if (!tracing) {
      tracing = true
      // record-continuously：环形缓冲，保留最近事件，适合抓偶发拖动卡顿（而非录满即停）。
      // 只录渲染进程主线程关心的类别，避免主进程/IO 线程噪音与 DevTools 通信流污染。
      await contentTracing.startRecording({
        recording_mode: 'record-continuously',
        included_categories: [
          'blink', 'v8', 'devtools.timeline', 'disabled-by-default-v8.cpu_profiler',
          'disabled-by-default-devtools.timeline', 'toplevel', 'benchmark'
        ],
        excluded_categories: ['*']
      })
      console.log('[trace] 开始录制（再按 Ctrl+Shift+T 停止并保存）')
    } else {
      tracing = false
      const result = await dialog.showSaveDialog(win, {
        title: '保存 trace',
        defaultPath: `trace-${Date.now()}.json`,
        filters: [{ name: 'Trace JSON', extensions: ['json'] }]
      })
      if (result.canceled || !result.filePath) {
        void contentTracing.stopRecording()
        return
      }
      await contentTracing.stopRecording(result.filePath)
      console.log('[trace] 已保存:', result.filePath)
    }
  })
}

app.whenReady().then(async () => {
  registerIpc()

  // 启动期硬门禁：adb + USB 驱动，缺一即报错终止
  const ok = await guardEnv()
  if (!ok) return

  // 首次启动初始化默认监控进程列表（已存在则保持用户配置不变）
  readProcesses()

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// 退出前停止轮询：作废在途 tick、清 timer，避免 in-flight adb 子进程残留
app.on('before-quit', () => {
  stopPoller()
})

// 外链用系统浏览器打开
app.on('web-contents-created', (_e, contents) => {
  contents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http')) void shell.openExternal(url)
    return { action: 'deny' }
  })
})
