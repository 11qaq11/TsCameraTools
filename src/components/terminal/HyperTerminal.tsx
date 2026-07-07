// HyperTerminal 主组件 - 组合所有终端组件
// 使用 child_process.spawn + 本地回显方案

import { useState, useCallback, useRef, useEffect } from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store'
import Header from './Header'
import Term from './Term'
import SearchBox from './SearchBox'
import StatusBar from './StatusBar'
import type { TermRef } from './Term'
import { logger } from '../../utils/logger'

interface HyperTerminalProps {
  shellId: string
  serial: string
  socket: any
  onClose: () => void
}

export default function HyperTerminal({
  shellId,
  serial,
  socket,
  onClose
}: HyperTerminalProps) {
  const [maximized, setMaximized] = useState(false)
  const [cols, setCols] = useState(80)
  const [rows, setRows] = useState(24)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const sessionActive = useRef(true)
  const inputBuffer = useRef('')
  const cursorPos = useRef(0)
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const ui = useSelector((state: RootState) => state.ui)
  const termRef = useRef<TermRef | null>(null)

  // 提示符
  const promptPrefix = `\x1b[1;32m${serial}\x1b[0m \x1b[1;34m$\x1b[0m `

  const writePrompt = useCallback(() => {
    if (termRef.current) {
      termRef.current.write('\r\x1b[K' + promptPrefix)
      if (inputBuffer.current) {
        termRef.current.write(inputBuffer.current)
      }
      cursorPos.current = inputBuffer.current.length
    }
  }, [promptPrefix])

  // 监听 socket 事件
  useEffect(() => {
    if (!socket || !shellId) return

    const handleOutput = (data: { sessionId: string; data: string }) => {
      if (data.sessionId === shellId && termRef.current) {
        if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
        termRef.current.write(data.data)
        promptTimerRef.current = setTimeout(writePrompt, 30)
      }
    }

    const handleExit = (data: { sessionId: string; code: number | null }) => {
      if (data.sessionId === shellId) {
        sessionActive.current = false
        if (termRef.current) {
          termRef.current.write('\r\n\x1b[1;31m╔══════════════════════════════════════════════════════════════╗\x1b[0m\r\n')
          termRef.current.write('\x1b[1;31m║\x1b[0m  \x1b[1;33mSession Ended\x1b[0m                                              \x1b[1;31m║\x1b[0m\r\n')
          termRef.current.write('\x1b[1;31m║\x1b[0m  \x1b[90mDevice disconnected. Please refresh and reconnect.\x1b[0m         \x1b[1;31m║\x1b[0m\r\n')
          termRef.current.write('\x1b[1;31m╚══════════════════════════════════════════════════════════════╝\x1b[0m\r\n')
        }
      }
    }

    const handleStarted = (data: { sessionId: string; serial: string }) => {
      if (data.sessionId === shellId) {
        logger.info('HyperTerminal', `Session started: ${data.sessionId}`)
        // 显示欢迎信息和提示符
        if (termRef.current) {
          termRef.current.write('\x1b[1;34m╔══════════════════════════════════════════════════════════════╗\x1b[0m\r\n')
          termRef.current.write('\x1b[1;34m║\x1b[0m  \x1b[1;36mADB Shell Terminal\x1b[0m                                      \x1b[1;34m║\x1b[0m\r\n')
          termRef.current.write('\x1b[1;34m║\x1b[0m  \x1b[33mDevice:\x1b[0m ' + serial.padEnd(50) + '\x1b[1;34m║\x1b[0m\r\n')
          termRef.current.write('\x1b[1;34m╚══════════════════════════════════════════════════════════════╝\x1b[0m\r\n')
          termRef.current.write('\r\n')
          writePrompt()
        }
      }
    }

    socket.on('shell:output', handleOutput)
    socket.on('shell:exit', handleExit)
    socket.on('shell:started', handleStarted)

    return () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current)
      socket.off('shell:output', handleOutput)
      socket.off('shell:exit', handleExit)
      socket.off('shell:started', handleStarted)
    }
  }, [socket, shellId, writePrompt])

  // 处理终端输入（本地回显模式）
  const handleData = useCallback((data: string) => {
    if (!socket || !shellId || !sessionActive.current) return

    // 本地回显
    if (termRef.current) {
      if (data === '\r') {
        // Enter
        termRef.current.write('\r\n')
        socket.emit('shell:input', { sessionId: shellId, input: inputBuffer.current + '\n' })
        inputBuffer.current = ''
        cursorPos.current = 0
      } else if (data === '\x7f' || data === '\b') {
        // Backspace
        if (cursorPos.current > 0) {
          const before = inputBuffer.current.slice(0, cursorPos.current - 1)
          const after = inputBuffer.current.slice(cursorPos.current)
          inputBuffer.current = before + after
          cursorPos.current--
          termRef.current.write('\b' + after + ' ')
          termRef.current.write('\x1b[' + after.length + 'D')
        }
      } else if (data === '\x03') {
        // Ctrl+C
        termRef.current.write('^C\r\n')
        socket.emit('shell:input', { sessionId: shellId, input: '\x03' })
        inputBuffer.current = ''
        cursorPos.current = 0
        writePrompt()
      } else if (data === '\x04') {
        // Ctrl+D
        socket.emit('shell:input', { sessionId: shellId, input: '\x04' })
      } else if (data >= ' ') {
        // 可打印字符
        const before = inputBuffer.current.slice(0, cursorPos.current)
        const after = inputBuffer.current.slice(cursorPos.current)
        inputBuffer.current = before + data + after
        cursorPos.current += data.length
        termRef.current.write(data + after)
        if (after.length) {
          termRef.current.write('\x1b[' + after.length + 'D')
        }
      }
    }
  }, [socket, shellId, writePrompt])

  // 处理终端大小变化
  const handleResize = useCallback((newCols: number, newRows: number) => {
    setCols(newCols)
    setRows(newRows)
  }, [])

  // 处理标题变化
  const handleTitle = useCallback((title: string) => {
    logger.info('HyperTerminal', `Title: ${title}`)
  }, [])

  // 终止会话
  const killSession = useCallback(() => {
    if (socket && shellId) {
      socket.emit('shell:kill', { sessionId: shellId })
      sessionActive.current = false
    }
  }, [socket, shellId])

  // 复制
  const handleCopy = useCallback(() => {
    if (termRef.current) {
      const selection = termRef.current.getSelection()
      if (selection) {
        navigator.clipboard.writeText(selection)
      }
    }
  }, [])

  // 粘贴
  const handlePaste = useCallback(async () => {
    const text = await navigator.clipboard.readText()
    if (text && termRef.current) {
      // 本地回显
      inputBuffer.current += text
      cursorPos.current += text.length
      termRef.current.write(text)
      // 发送到后端
      socket.emit('shell:input', { sessionId: shellId, input: text })
    }
  }, [socket, shellId])

  // 关闭
  const handleClose = useCallback(() => {
    killSession()
    onClose()
  }, [killSession, onClose])

  // 最大化/还原
  const handleMaximize = useCallback(() => {
    setMaximized(prev => !prev)
  }, [])

  // 搜索
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (termRef.current) {
      termRef.current.search(query)
    }
  }, [])

  const handleSearchNext = useCallback(() => {
    if (termRef.current) {
      termRef.current.searchNext()
    }
  }, [])

  const handleSearchPrevious = useCallback(() => {
    if (termRef.current) {
      termRef.current.searchPrevious()
    }
  }, [])

  return (
    <div
      className={`flex flex-col rounded-xl border border-gray-200 overflow-hidden shadow-lg transition-all relative ${
        maximized ? 'fixed inset-4 z-50' : 'flex-1 min-h-0'
      }`}
    >
      <SearchBox
        visible={showSearch}
        query={searchQuery}
        results={{ current: 0, total: 0 }}
        onQueryChange={handleSearch}
        onNext={handleSearchNext}
        onPrevious={handleSearchPrevious}
        onClose={() => setShowSearch(false)}
      />

      <Header
        serial={serial}
        maximized={maximized}
        onSearch={() => setShowSearch(true)}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onMaximize={handleMaximize}
        onClose={handleClose}
      />

      <Term
        ref={termRef}
        uid={shellId}
        cols={cols}
        rows={rows}
        scrollback={ui.scrollback}
        cursorColor={ui.cursorColor}
        cursorAccentColor={ui.cursorAccentColor}
        cursorShape={ui.cursorShape}
        cursorBlink={ui.cursorBlink}
        borderColor={ui.borderColor}
        selectionColor={ui.selectionColor}
        fontSize={ui.fontSize}
        fontFamily={ui.fontFamily}
        fontWeight={ui.fontWeight}
        fontWeightBold={ui.fontWeightBold}
        lineHeight={ui.lineHeight}
        letterSpacing={ui.letterSpacing}
        padding={ui.padding}
        foregroundColor={ui.foregroundColor}
        backgroundColor={ui.backgroundColor}
        colors={ui.colors}
        webGLRenderer={ui.webGLRenderer}
        copyOnSelect={ui.copyOnSelect}
        bell={ui.bell}
        onData={handleData}
        onResize={handleResize}
        onTitle={handleTitle}
      />

      <StatusBar
        connected={true}
        cols={cols}
        rows={rows}
        serial={serial}
      />
    </div>
  )
}
