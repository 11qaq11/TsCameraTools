import express from 'express'
import { createServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from './utils/logger.js'
import { runMigrations } from './db/migrations.js'
import { closePool } from './db/index.js'
import { setupTerminalWss } from './services/terminal.js'
import { setupMemoryWss } from './services/memory-ws.js'
import authRoutes from './routes/auth.js'
import adbRoutes from './routes/adb.js'
import logRoutes from './routes/logs.js'
import ttydRoutes from './routes/ttyd.js'
import debugRoutes from './routes/debug.js'
import memoryRoutes from './routes/memory.js'
import userRoutes from './routes/user.js'
import feedbackRoutes from './routes/feedback.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Global crash handlers
process.on('uncaughtException', (err) => {
  // Suppress node-pty AttachConsole errors on Windows (known issue with Node.js v24)
  if (err.message?.includes('AttachConsole')) {
    logger.warn({ error: err.message }, 'node-pty AttachConsole error (suppressed)')
    return
  }
  logger.fatal({ error: err.message, stack: err.stack }, 'UNCAUGHT EXCEPTION')
  process.exit(1)
})
process.on('unhandledRejection', (reason) => {
  logger.error({ reason: String(reason) }, 'UNHANDLED REJECTION')
})

const app = express()
const PORT = process.env.PORT || 3000

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

app.use('/auth', authRoutes)
app.use('/api/adb', adbRoutes)
app.use('/api/logs', logRoutes)
app.use('/api/ttyd', ttydRoutes)
app.use('/api/debug', debugRoutes)
app.use('/api/memory', memoryRoutes)
app.use('/api/user', userRoutes)
app.use('/api/feedback', feedbackRoutes)

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// 生产模式：托管前端静态文件
if (process.env.NODE_ENV === 'production') {
  const staticPath = path.join(__dirname, '..')
  if (fs.existsSync(path.join(staticPath, 'index.html'))) {
    app.use(express.static(staticPath))
    app.get('*', (_req, res) => {
      res.sendFile(path.join(staticPath, 'index.html'))
    })
    logger.info({ path: staticPath }, 'Serving frontend static files')
  }
}

// Express global error middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled route error')
  res.status(500).json({ error: 'Internal server error' })
})

const useHttps = process.env.HTTPS === 'true'
let server: ReturnType<typeof createHttpServer>

if (useHttps) {
  try {
    const certPath = path.join(__dirname, '..', 'certs')
    const httpsOptions = {
      key: fs.readFileSync(path.join(certPath, 'key.pem')),
      cert: fs.readFileSync(path.join(certPath, 'cert.pem'))
    }
    server = createServer(httpsOptions, app)
  } catch (err) {
    logger.fatal({ error: (err as Error).message }, 'Failed to load HTTPS certs')
    process.exit(1)
  }
} else {
  server = createHttpServer(app)
}

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', (socket) => {
  logger.info({ socketId: socket.id }, 'Client connected')
  socket.on('disconnect', () => {
    logger.info({ socketId: socket.id }, 'Client disconnected')
  })
})

// 初始化数据库并启动服务器
async function startServer() {
  try {
    // 运行数据库迁移
    await runMigrations()
    logger.info('Database migrations completed')
  } catch (err) {
    logger.fatal({ error: (err as Error).message }, 'Database initialization failed')
    process.exit(1)
  }

  server.listen(PORT, () => {
    logger.info({ port: PORT, https: useHttps }, `Server started`)
    setupTerminalWss(server)
    setupMemoryWss(server)
  })
}

startServer()

// 优雅关闭
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await closePool()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await closePool()
  process.exit(0)
})

server.on('error', (err) => {
  logger.fatal({ error: err.message, port: PORT }, 'Server listen error')
})
