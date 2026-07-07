import express from 'express'
import { createServer } from 'https'
import { createServer as createHttpServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import authRoutes from './routes/auth.js'
import adbRoutes from './routes/adb.js'
import logRoutes from './routes/logs.js'
import { setupShellSocket } from './services/shell.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3000

// CORS 配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}))

app.use(express.json())

// 路由
app.use('/auth', authRoutes)
app.use('/api/adb', adbRoutes)
app.use('/api/logs', logRoutes)

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() })
})

// HTTPS 配置
const useHttps = process.env.HTTPS === 'true'
let server

if (useHttps) {
  const certPath = path.join(__dirname, '..', 'certs')
  const httpsOptions = {
    key: fs.readFileSync(path.join(certPath, 'key.pem')),
    cert: fs.readFileSync(path.join(certPath, 'cert.pem'))
  }
  server = createServer(httpsOptions, app)
} else {
  server = createHttpServer(app)
}

// Socket.io 配置
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

// WebSocket 终端会话
setupShellSocket(io)

// 启动服务器
server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 ${useHttps ? 'https' : 'http'}://localhost:${PORT}`)
})
