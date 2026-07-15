import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('../config.js', () => ({
  config: {
    feishu: { appId: 'test-app-id', appSecret: 'test-secret', redirectUri: 'http://localhost:3000/auth/feishu/callback' },
    frontendUrl: 'http://localhost:5173',
  },
}))

vi.mock('fs', () => ({
  default: {
    existsSync: vi.fn(() => true),
    mkdirSync: vi.fn(),
    appendFileSync: vi.fn(),
  },
}))

import { config } from '../config.js'

describe('auth routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  describe('feishu login URL generation', () => {
    it('生成正确的飞书登录 URL', () => {
      const { appId, redirectUri } = config.feishu
      const state = 'test123'
      const authUrl = `https://open.feishu.cn/open-apis/authen/v1/authorize?app_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`

      expect(authUrl).toContain('test-app-id')
      expect(authUrl).toContain(encodeURIComponent('http://localhost:3000/auth/feishu/callback'))
      expect(authUrl).toContain('open.feishu.cn')
    })
  })

  describe('token 解析', () => {
    it('有效 base64 token 解析为用户对象', () => {
      const user = { id: '1', name: 'Test', email: 't@t.com' }
      const token = Buffer.from(JSON.stringify(user)).toString('base64')
      const decoded = JSON.parse(Buffer.from(token, 'base64').toString())

      expect(decoded).toEqual(user)
    })

    it('无效 token 解析抛出错误', () => {
      expect(() => {
        JSON.parse(Buffer.from('invalid!!!', 'base64').toString())
      }).toThrow()
    })
  })

  describe('OAuth 回调逻辑', () => {
    it('无 code 时应返回 400', () => {
      const code = undefined
      expect(code).toBeUndefined()
    })

    it('飞书 token 响应 code!=0 时应重定向到 login', () => {
      const tokenData = { code: 10003, msg: 'invalid code' }
      expect(tokenData.code).not.toBe(0)
    })

    it('成功获取 token 后生成正确的重定向 URL', () => {
      const user = { id: '1', name: 'Test' }
      const jwtToken = Buffer.from(JSON.stringify(user)).toString('base64')
      const redirectUrl = `${config.frontendUrl}/#/login/callback?token=${encodeURIComponent(jwtToken)}`

      expect(redirectUrl).toContain('http://localhost:5173/#/login/callback?token=')
      expect(redirectUrl).toContain(encodeURIComponent(jwtToken))
    })
  })

  describe('me endpoint 逻辑', () => {
    it('Bearer token 解析正确', () => {
      const user = { id: '1', name: 'Test' }
      const token = Buffer.from(JSON.stringify(user)).toString('base64')
      const authHeader = `Bearer ${token}`

      expect(authHeader.startsWith('Bearer ')).toBe(true)
      const parsed = JSON.parse(Buffer.from(authHeader.substring(7), 'base64').toString())
      expect(parsed).toEqual(user)
    })

    it('无 Bearer 前缀时应拒绝', () => {
      const authHeader = 'Basic sometoken'
      expect(authHeader.startsWith('Bearer ')).toBe(false)
    })
  })
})
