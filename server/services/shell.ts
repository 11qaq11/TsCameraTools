import { Server, Socket } from 'socket.io'
import { spawn, ChildProcess } from 'child_process'
import { config } from '../config.js'
import { v4 as uuidv4 } from 'uuid'

interface ShellSession {
  id: string
  serial: string
  process: ChildProcess
  userId: string
}

const sessions = new Map<string, ShellSession>()

export function setupShellSocket(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('Client connected:', socket.id)
    let currentSession: ShellSession | null = null

    // 启动终端会话
    socket.on('shell:start', (data: { serial: string; userId: string }) => {
      const { serial, userId } = data
      const sessionId = uuidv4()
      const adbPath = config.adb.path

      // 启动 adb shell 进程
      const shellProcess = spawn(adbPath, ['-s', serial, 'shell'], {
        stdio: ['pipe', 'pipe', 'pipe']
      })

      const session: ShellSession = {
        id: sessionId,
        serial,
        process: shellProcess,
        userId
      }

      sessions.set(sessionId, session)
      currentSession = session

      // 发送会话 ID 到客户端
      socket.emit('shell:started', { sessionId, serial })

      // 处理 stdout
      shellProcess.stdout?.on('data', (data: Buffer) => {
        socket.emit('shell:output', { sessionId, data: data.toString() })
      })

      // 处理 stderr
      shellProcess.stderr?.on('data', (data: Buffer) => {
        socket.emit('shell:output', { sessionId, data: data.toString() })
      })

      // 处理进程退出
      shellProcess.on('exit', (code: number | null) => {
        socket.emit('shell:exit', { sessionId, code })
        sessions.delete(sessionId)
        currentSession = null
      })

      // 处理错误
      shellProcess.on('error', (err: Error) => {
        socket.emit('shell:error', { sessionId, error: err.message })
        sessions.delete(sessionId)
        currentSession = null
      })
    })

    // 处理终端输入
    socket.on('shell:input', (data: { sessionId: string; input: string }) => {
      const session = sessions.get(data.sessionId)
      if (session && session.process.stdin) {
        session.process.stdin.write(data.input)
      }
    })

    // 处理终端大小调整
    socket.on('shell:resize', (data: { sessionId: string; cols: number; rows: number }) => {
      // 注意：child_process 不支持 resize，需要使用 node-pty
      // 这里是简化实现
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
      if (currentSession) {
        currentSession.process.kill()
        sessions.delete(currentSession.id)
        currentSession = null
      }
    })
  })
}
