import express from 'express'
import { createServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { logger } from './utils/logger.js'
import { setupTerminalWss } from './services/terminal.js'
import authRoutes from './routes/auth.js'
import adbRoutes from './routes/adb.js'
import logRoutes from './routes/logs.js'
import ttydRoutes from './routes/ttyd.js'
import debugRoutes from './routes/debug.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Global crash handlers
process.on('uncaughtException', (err) => {
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

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// Express global error middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ error: err.message, stack: err.stack }, 'Unhandled route error')
  res.status(500).json({ error: 'Internal server error' })
})

const useHttps = process.env.HTTPS === 'true'
let server

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

server.listen(PORT, () => {
  logger.info({ port: PORT, https: useHttps }, `Server started`)
  setupTerminalWss(server)
})

server.on('error', (err) => {
  logger.fatal({ error: err.message, port: PORT }, 'Server listen error')
})
