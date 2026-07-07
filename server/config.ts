import dotenv from 'dotenv'

dotenv.config()

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
    path: process.env.ADB_PATH || 'adb'
  },

  // ttyd 配置
  ttyd: {
    portStart: parseInt(process.env.TTYD_PORT_START || '7681'),
    portEnd: parseInt(process.env.TTYD_PORT_END || '7690'),
    credential: process.env.TTYD_CREDENTIAL || 'admin:admin'
  }
}
