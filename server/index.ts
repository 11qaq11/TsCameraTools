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
import ttydRoutes from './routes/ttyd.js'
import debugRoutes from './routes/debug.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

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

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
})

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id)
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })
})

server.listen(PORT, () => {
  console.log(`🚀 服务器运行在 ${useHttps ? 'https' : 'http'}://localhost:${PORT}`)
})
