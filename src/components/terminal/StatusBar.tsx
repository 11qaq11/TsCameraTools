// StatusBar 组件 - 终端状态栏
// 参考: Hyper 的状态栏

interface StatusBarProps {
  connected: boolean
  cols: number
  rows: number
  serial: string
}

export default function StatusBar({ connected, cols, rows, serial }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between px-4 py-1 bg-gray-800 border-t border-gray-700">
      {/* 左侧: 连接状态 */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          <span className={connected ? 'text-green-400' : 'text-red-400'}>
            {connected ? '●' : '○'}
          </span>
          {' '}{connected ? 'Connected' : 'Disconnected'}
        </span>
        <span className="text-xs text-gray-500 font-mono">
          {serial}
        </span>
      </div>

      {/* 右侧: 终端大小 */}
      <div className="flex items-center gap-4">
        <span className="text-xs text-gray-500">
          {cols}×{rows}
        </span>
        <span className="text-xs text-gray-500">
          Ctrl+C: Interrupt
        </span>
        <span className="text-xs text-gray-500">
          Ctrl+D: EOF
        </span>
      </div>
    </div>
  )
}
