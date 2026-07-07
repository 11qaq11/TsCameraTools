// useTerminal hook - 管理终端生命周期和 WebSocket 通信
// 参考: Hyper 的终端管理方式

import { useEffect, useRef, useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store'
import { resizeSession } from '../store/reducers/sessions'
import { logger } from '../utils/logger'

interface UseTerminalOptions {
  uid: string
  serial?: string
  socket: any // Socket.io client
  sessionId: string
}

export function useTerminal({ uid, socket, sessionId }: UseTerminalOptions) {
  const dispatch = useDispatch()
  const ui = useSelector((state: RootState) => state.ui)
  const termRef = useRef<HTMLDivElement>( null)
  const sessionActive = useRef(true)

  // 处理终端输出
  useEffect(() => {
    if (!socket || !sessionId) return

    const handleOutput = (data: { sessionId: string; data: string }) => {
      if (data.sessionId === sessionId && termRef.current) {
        const write = (termRef.current as any).termWrite
        if (write) {
          write(data.data)
        }
      }
    }

    const handleExit = (data: { sessionId: string; code: number | null }) => {
      if (data.sessionId === sessionId) {
        sessionActive.current = false
        logger.warn('Terminal', `Session ${sessionId} exited with code ${data.code}`)
        if (termRef.current) {
          const write = (termRef.current as any).termWrite
          if (write) {
            write('\r\n\x1b[1;31m╔══════════════════════════════════════════════════════════════╗\x1b[0m\r\n')
            write('\x1b[1;31m║\x1b[0m  \x1b[1;33mSession Ended\x1b[0m                                              \x1b[1;31m║\x1b[0m\r\n')
            write('\x1b[1;31m║\x1b[0m  \x1b[90mDevice disconnected. Please refresh and reconnect.\x1b[0m         \x1b[1;31m║\x1b[0m\r\n')
            write('\x1b[1;31m╚══════════════════════════════════════════════════════════════╝\x1b[0m\r\n')
          }
        }
      }
    }

    socket.on('shell:output', handleOutput)
    socket.on('shell:exit', handleExit)

    return () => {
      socket.off('shell:output', handleOutput)
      socket.off('shell:exit', handleExit)
    }
  }, [socket, sessionId])

  // 处理终端输入
  const handleData = useCallback((data: string) => {
    if (!socket || !sessionId || !sessionActive.current) return
    socket.emit('shell:input', { sessionId, input: data })
  }, [socket, sessionId])

  // 处理终端大小变化
  const handleResize = useCallback((cols: number, rows: number) => {
    if (!socket || !sessionId) return
    dispatch(resizeSession({ uid, cols, rows }))
    socket.emit('shell:resize', { sessionId, cols, rows })
    logger.info('Terminal', `Resize: ${cols}x${rows}`)
  }, [socket, sessionId, uid, dispatch])

  // 处理标题变化
  const handleTitle = useCallback((title: string) => {
    logger.info('Terminal', `Title: ${title}`)
  }, [])

  // 终止会话
  const killSession = useCallback(() => {
    if (socket && sessionId) {
      logger.info('Terminal', `Kill session ${sessionId}`)
      socket.emit('shell:kill', { sessionId })
      sessionActive.current = false
    }
  }, [socket, sessionId])

  return {
    termRef,
    ui,
    handleData,
    handleResize,
    handleTitle,
    killSession,
    sessionActive: sessionActive.current
  }
}
