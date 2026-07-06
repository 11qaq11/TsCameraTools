import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { config } from '../config.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = Router()

function logToFile(msg: string) {
  const logDir = path.join(__dirname, '..', '..', 'logs')
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true })
  const logFile = path.join(logDir, 'auth.log')
  fs.appendFileSync(logFile, `[${new Date().toISOString()}] ${msg}\n`)
}

// 生成飞书登录链接
router.get('/feishu/login', (req, res) => {
  const { appId, redirectUri } = config.feishu
  const state = Math.random().toString(36).substring(7)
  
  const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`
  
  res.json({ authUrl, state })
})

// 飞书 OAuth 回调
router.get('/feishu/callback', async (req, res) => {
  const { code, state } = req.query
  
  logToFile(`Callback called with code=${code}, state=${state}`)
  
  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // 1. 获取 app_access_token
    logToFile('Getting app_access_token...')
    const appToken = await getAppAccessToken()
    logToFile(`Got app_access_token: ${appToken.substring(0, 10)}...`)
    
    // 2. 用 code 换取 user access token
    logToFile('Exchanging code for access token...')
    const tokenResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/oidc/access_token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${appToken}`
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code: code as string
      })
    })

    const tokenData = await tokenResponse.json() as Record<string, unknown>
    logToFile(`Token response: ${JSON.stringify(tokenData)}`)

    if (tokenData.code !== 0) {
      logToFile(`Token error: ${JSON.stringify(tokenData)}`)
      return res.redirect(`${config.frontendUrl}/login`)
    }

    const accessToken = (tokenData.data as Record<string, unknown>)?.access_token as string
    if (!accessToken) {
      logToFile(`No access_token in response: ${JSON.stringify(tokenData)}`)
      return res.redirect(`${config.frontendUrl}/login`)
    }

    // 3. 获取用户信息
    logToFile('Getting user info...')
    const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const userData = await userResponse.json() as Record<string, unknown>
    logToFile(`User response: ${JSON.stringify(userData)}`)

    if (userData.code !== 0) {
      logToFile(`User info error: ${JSON.stringify(userData)}`)
      return res.redirect(`${config.frontendUrl}/login`)
    }

    const data = userData.data as Record<string, unknown>
    
    const user = {
      id: String(data.open_id || data.user_id || data.union_id || ''),
      name: String(data.name || ''),
      email: String(data.email || ''),
      avatar: String(data.avatar_url || (data.avatar as Record<string, unknown>)?.avatar_72 || data.avatar_thumb || ''),
      tenantKey: String(data.tenant_key || '')
    }

    logToFile(`User parsed: ${JSON.stringify(user)}`)

    // 4. 生成 token (Base64 编码)
    const jwtToken = Buffer.from(JSON.stringify(user)).toString('base64')

    // 5. 重定向到前端，token 通过 URL 传递（使用 HashRouter 格式）
    const redirectUrl = `${config.frontendUrl}/#/login/callback?token=${encodeURIComponent(jwtToken)}`
    logToFile(`Redirecting to frontend: ${config.frontendUrl}/#/login/callback?token=...`)
    res.redirect(302, redirectUrl)
  } catch (error) {
    logToFile(`Exception: ${error instanceof Error ? error.stack : String(error)}`)
    console.error('Feishu OAuth error:', error)
    res.redirect(`${config.frontendUrl}/login`)
  }
})

// 获取当前用户信息
router.get('/me', (req, res) => {
  const authHeader = req.headers.authorization
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }

  try {
    const token = authHeader.substring(7)
    const user = JSON.parse(Buffer.from(token, 'base64').toString())
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'Invalid token' })
  }
})

// 登出
router.post('/logout', (req, res) => {
  res.json({ success: true })
})

// 获取 app_access_token
async function getAppAccessToken(): Promise<string> {
  const { appId, appSecret } = config.feishu
  
  const response = await fetch('https://open.feishu.cn/open-apis/auth/v3/app_access_token/internal', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      app_id: appId,
      app_secret: appSecret
    })
  })

  const data = await response.json() as {
    code: number
    msg: string
    app_access_token: string
    expire: number
  }
  
  if (data.code !== 0) {
    throw new Error(`Failed to get app_access_token: ${data.msg}`)
  }
  
  return data.app_access_token
}

export default router
