// SearchBox 组件 - 搜索框
// 参考: Hyper 的搜索功能

import { useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, X } from 'lucide-react'

interface SearchBoxProps {
  visible: boolean
  query: string
  results: { current: number; total: number }
  onQueryChange: (query: string) => void
  onNext: () => void
  onPrevious: () => void
  onClose: () => void
}

export default function SearchBox({
  visible,
  query,
  results,
  onQueryChange,
  onNext,
  onPrevious,
  onClose
}: SearchBoxProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // 自动聚焦
  useEffect(() => {
    if (visible && inputRef.current) {
      inputRef.current.focus()
    }
  }, [visible])

  // 键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose()
    } else if (e.key === 'Enter') {
      if (e.shiftKey) {
        onPrevious()
      } else {
        onNext()
      }
    }
  }

  if (!visible) return null

  return (
    <div className="absolute top-2 right-2 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2">
      <div className="flex items-center gap-2">
        <Search size={14} className="text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="搜索..."
          className="bg-gray-700 text-gray-200 text-sm px-2 py-1 rounded outline-none w-64"
        />
        <span className="text-xs text-gray-500">
          {results.total > 0 ? `${results.current}/${results.total}` : '无结果'}
        </span>
        <button
          onClick={onPrevious}
          className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="上一个 (Shift+Enter)"
        >
          <ChevronUp size={14} />
        </button>
        <button
          onClick={onNext}
          className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="下一个 (Enter)"
        >
          <ChevronDown size={14} />
        </button>
        <button
          onClick={onClose}
          className="p-1 rounded text-gray-400 hover:text-gray-200 hover:bg-gray-700 transition-colors"
          title="关闭 (Esc)"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
