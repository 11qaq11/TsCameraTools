import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

dotenv.config()

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// 项目根目录：开发模式下是 server/ 的父目录，编译后是 dist/ 的父目录
const projectRoot = path.resolve(__dirname, '..')

function resolveAdbPath(): string {
  // 1. 优先使用项目内置的 ADB
  const bundled = path.join(projectRoot, 'bin', 'platform-tools', 'adb.exe')
  if (fs.existsSync(bundled)) return bundled
  // 2. 使用 .env 配置的路径
  const configured = process.env.ADB_PATH
  if (configured && fs.existsSync(configured)) return configured
  // 3. 回退到 PATH 中的 adb
  return 'adb'
}

export const config = {
  // 服务器配置
  port: parseInt(process.env.PORT || '3000'),
  https: process.env.HTTPS === 'true',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',

  // 飞书 OAuth 配置
  feishu: {
    appId: process.env.FEISHU_APP_ID || '',
    appSecret: process.env.FEISHU_APP_SECRET || '',
    redirectUri: process.env.FEISHU_REDIRECT_URI || 'https://localhost:3000/auth/feishu/callback'
  },

  // ADB 配置
  adb: {
    path: resolveAdbPath()
  },

  // ttyd 配置
  ttyd: {
    portStart: parseInt(process.env.TTYD_PORT_START || '7681'),
    portEnd: parseInt(process.env.TTYD_PORT_END || '7690'),
    credential: process.env.TTYD_CREDENTIAL || 'admin:admin'
  },

  // 数据库配置
  database: {
    url: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/tscameratools'
  },

  // 会话配置
  session: {
    expiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24')
  }
}
