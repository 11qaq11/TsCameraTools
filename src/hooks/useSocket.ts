import { useEffect, useRef, useCallback, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { getAuthToken } from '../utils/auth'

export function useSocket() {
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const token = getAuthToken()
    const socketUrl = window.location.origin
    
    const socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 10000
    })

    socket.on('connect', () => {
      console.log('[Socket] connected, id:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] disconnected')
      setConnected(false)
    })

    socket.on('connect_error', (err: Error) => {
      console.warn('[Socket] connection error:', err.message)
      setConnected(false)
    })

    socketRef.current = socket

    return () => {
      socket.disconnect()
    }
  }, [])

  const emit = useCallback((event: string, data?: unknown) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data)
    } else {
      console.warn('[Socket] not connected, cannot emit:', event)
    }
  }, [])

  const on = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.on(event, callback)
    return () => {
      socketRef.current?.off(event, callback)
    }
  }, [])

  const once = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.once(event, callback)
  }, [])

  const off = useCallback((event: string, callback: (...args: unknown[]) => void) => {
    socketRef.current?.off(event, callback)
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    once,
    off,
    connected
  }
}
