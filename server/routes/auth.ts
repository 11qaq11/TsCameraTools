import { Router } from 'express'
import { randomUUID } from 'crypto'
import { config } from '../config.js'
import { query } from '../db/index.js'
import { authMiddleware } from '../middleware/auth.js'
import { logger } from '../utils/logger.js'

const router = Router()

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

  logger.info({ code, state }, 'Feishu OAuth callback')

  if (!code) {
    return res.status(400).json({ error: 'Missing authorization code' })
  }

  try {
    // 1. 获取 app_access_token
    const appToken = await getAppAccessToken()

    // 2. 用 code 换取 user access token
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

    if (tokenData.code !== 0) {
      logger.error({ tokenData }, 'Token exchange error')
      return res.redirect(`${config.frontendUrl}/login`)
    }

    const accessToken = (tokenData.data as Record<string, unknown>)?.access_token as string
    if (!accessToken) {
      logger.error({ tokenData }, 'No access_token in response')
      return res.redirect(`${config.frontendUrl}/login`)
    }

    // 3. 获取用户信息
    const userResponse = await fetch('https://open.feishu.cn/open-apis/authen/v1/user_info', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    })

    const userData = await userResponse.json() as Record<string, unknown>

    if (userData.code !== 0) {
      logger.error({ userData }, 'User info error')
      return res.redirect(`${config.frontendUrl}/login`)
    }

    const data = userData.data as Record<string, unknown>

    const feishuId = String(data.open_id || data.user_id || data.union_id || '')
    const name = String(data.name || '')
    const email = String(data.email || '')
    const avatar = String(data.avatar_url || (data.avatar as Record<string, unknown>)?.avatar_72 || data.avatar_thumb || '')
    const tenantKey = String(data.tenant_key || '')

    logger.info({ feishuId, name, tenantKey }, 'User authenticated')

    // 4. UPSERT 用户记录 (新用户默认 role='user', 老用户保留现有 role)
    const { rows: userRows } = await query<{ id: number }>(
      `INSERT INTO users (feishu_id, name, email, avatar, tenant_key, role, last_login_at)
       VALUES ($1, $2, $3, $4, $5, 'user', NOW())
       ON CONFLICT (feishu_id) DO UPDATE SET
         name = EXCLUDED.name,
         email = EXCLUDED.email,
         avatar = EXCLUDED.avatar,
         tenant_key = EXCLUDED.tenant_key,
         last_login_at = NOW()
       RETURNING id`,
      [feishuId, name, email, avatar, tenantKey]
    )

    const userId = userRows[0].id

    // 5. 创建 session
    const sessionId = randomUUID()
    const expiryHours = config.session.expiryHours

    await query(
      `INSERT INTO sessions (id, user_id, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${expiryHours} hours')`,
      [sessionId, userId]
    )

    logger.info({ userId, sessionId }, 'Session created')

    // 6. 重定向到前端
    const redirectUrl = `${config.frontendUrl}/#/login/callback?token=${encodeURIComponent(sessionId)}`
    res.redirect(302, redirectUrl)
  } catch (error) {
    logger.error({ error: (error as Error).message, stack: (error as Error).stack }, 'Feishu OAuth error')
    res.redirect(`${config.frontendUrl}/login`)
  }
})

// 获取当前用户信息
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.user })
})

// 登出
router.post('/logout', async (req, res) => {
  const authHeader = req.headers.authorization

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const sessionId = authHeader.substring(7)
    try {
      await query('DELETE FROM sessions WHERE id = $1', [sessionId])
    } catch (err) {
      logger.error({ error: (err as Error).message }, 'Logout error')
    }
  }

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
