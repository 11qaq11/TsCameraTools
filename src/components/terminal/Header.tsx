// Header 组件 - 终端标签栏
// 参考: https://github.com/vercel/hyper/blob/canary/lib/components/header.tsx

import { Terminal, Search, Copy, Clipboard, Maximize2, Minimize2, X } from 'lucide-react'

interface HeaderProps {
  serial: string
  maximized: boolean
  onSearch: () => void
  onCopy: () => void
  onPaste: () => void
  onMaximize: () => void
  onClose: () => void
}

export default function Header({
  serial,
  maximized,
  onSearch,
  onCopy,
  onPaste,
  onMaximize,
  onClose
}: HeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 border-b border-gray-700">
      {/* 左侧: 窗口控制 + 标签 */}
      <div className="flex items-center gap-3">
        {/* 窗口控制按钮 (macOS 风格) */}
        <div className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded-full bg-red-500 hover:bg-red-400 cursor-pointer transition-colors"
            onClick={onClose}
            title="关闭"
          />
          <div
            className="w-3 h-3 rounded-full bg-yellow-500 hover:bg-yellow-400 cursor-pointer transition-colors"
            onClick={onMaximize}
            title={maximized ? "还原" : "最大化"}
          />
          <div
            className="w-3 h-3 rounded-full bg-green-500 hover:bg-green-400 cursor-pointer transition-colors"
            title="最小化"
          />
        </div>

        {/* 标签 */}
        <div className="flex items-center gap-2 ml-2">
          <Terminal size={14} className="text-blue-400" />
          <span className="text-sm font-medium text-gray-200">
            ADB Shell
          </span>
          <span className="text-xs text-gray-500">—</span>
          <span className="text-xs font-mono text-gray-400">{serial}</span>
        </div>
      </div>

      {/* 右侧: 操作按钮 */}
      <div className="flex items-center gap-1">
        <button
          onClick={onSearch}
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="搜索 (Ctrl+F)"
        >
          <Search size={14} />
        </button>
        <button
          onClick={onCopy}
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="复制"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={onPaste}
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="粘贴"
        >
          <Clipboard size={14} />
        </button>
        <button
          onClick={onMaximize}
          className="p-1.5 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title={maximized ? "还原" : "最大化"}
        >
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <button
          onClick={onClose}
          className="p-1.5 rounded text-gray-400 hover:text-red-400 hover:bg-gray-700 transition-colors"
          title="关闭"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
