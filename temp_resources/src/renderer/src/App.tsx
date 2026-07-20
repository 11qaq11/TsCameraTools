import { useEffect, useRef } from 'react'
import type { CSSProperties, MouseEvent as ReactMouseEvent } from 'react'
import { useStore } from './store'
import DeviceSelect from './pages/DeviceSelect'
import ProcessManager from './pages/ProcessManager'
import Dashboard from './pages/Dashboard'
import DetailPage from './pages/DetailPage'
import DmabufDetailPage from './pages/DmabufDetailPage'

// 设备掉线 / 命令启动失败的错误特征（命中即自动停抓，避免刷屏）
const DEVICE_LOST_RE = /device|offline|not found|no devices|failed to start|ENOENT|cannot connect/i
// 连续失败到该次数即判定设备异常，自动停抓
const MAX_CONSEC_ERRORS = 3

// 自定义标题栏（固定，不随页面滚动）。拖动改由 JS 驱动（mousedown→主进程轮询 setPosition），
// 不再用 app-region: drag——后者在 Windows 走同步模态拖动会冻结渲染主线程（trace 实测 61.7%）。
// 右上角最小化/最大化/关闭仍由 titleBarOverlay 原生绘制；双击标题栏切换最大化。
const TITLE_BAR_STYLE: CSSProperties = {
  height: 32,
  flex: '0 0 32px',
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  background: '#f5f7fa',
  borderBottom: '1px solid #f0f0f0',
  fontSize: 12,
  color: '#595959',
  userSelect: 'none',
  cursor: 'default',
}

export default function App() {
  const stage = useStore((s) => s.stage)
  const pushSamples = useStore((s) => s.pushSamples)
  const setPeakDmabufBreakdown = useStore((s) => s.setPeakDmabufBreakdown)
  const setError = useStore((s) => s.setError)
  const setPolling = useStore((s) => s.setPolling)
  const consecErrors = useRef(0)

  // 订阅抓取样本批量推送（一轮 tick 的 meminfo/dmabuf 同帧到达，左右栏同步）+
  // worker 在 ionKb 新峰值时抓取的 dmabuf_dump 明细（峰值时刻真实抓取，不阻塞主进程）
  useEffect(() => {
    const offSamples = window.api.capture.onSamples((samples) => {
      consecErrors.current = 0
      setError(null) // 数据恢复流动，清除瞬时错误
      pushSamples(samples)
    })
    const offPeak = window.api.capture.onPeak(({ name, breakdown }) => {
      setPeakDmabufBreakdown(name, breakdown)
    })
    const offError = window.api.capture.onError((e) => {
      consecErrors.current += 1
      const msg = `[${e.kind}] ${e.message}`
      const deviceLost = DEVICE_LOST_RE.test(e.message)
      if (deviceLost || consecErrors.current >= MAX_CONSEC_ERRORS) {
        void window.api.capture.stop()
        setPolling(false)
        setError(
          deviceLost
            ? `设备异常，已停止抓取：${msg}`
            : `连续 ${consecErrors.current} 次抓取失败，已停止：${msg}`
        )
      } else {
        setError(`抓取异常（已自动重试）：${msg}`)
      }
    })
    return () => {
      offSamples()
      offPeak()
      offError()
    }
  }, [pushSamples, setPeakDmabufBreakdown, setError, setPolling])

  // 自定义窗口拖动：mousedown 通知主进程 startDrag（主进程轮询光标 setPosition 驱动窗口），
  // mouseup 通知 stopDrag。不走 app-region 同步模态拖动 → 主线程不冻结，数据 tick 与图表正常更新。
  useEffect(() => {
    const onUp = () => window.api.win.stopDrag()
    window.addEventListener('mouseup', onUp)
    return () => window.removeEventListener('mouseup', onUp)
  }, [])

  const onTitleMouseDown = (e: ReactMouseEvent) => {
    if (e.button !== 0) return // 仅左键拖动
    window.api.win.startDrag()
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div
        style={TITLE_BAR_STYLE}
        onMouseDown={onTitleMouseDown}
        onDoubleClick={() => window.api.win.toggleMaximize()}
      >
        Android 内存抓取分析工具
      </div>
      {/* 标题栏 32px 固定；其下 main 填满剩余空间。main 为 flex 列容器 + overflow:hidden，
          页面根用 flex:1/minHeight:0 填满，内部各自滚动 → 标题栏永不随页面滚动。 */}
      <main style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {stage === 'device' && <DeviceSelect />}
        {stage === 'process' && <ProcessManager />}
        {stage === 'dashboard' && <Dashboard />}
        {stage === 'detail' && <DetailPage />}
        {stage === 'dmabuf-detail' && <DmabufDetailPage />}
      </main>
    </div>
  )
}
