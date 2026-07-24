import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { logger } from '../utils/logger'
import { LogViewer } from '../components/LogViewer'
import logoImg from '../components/headerLogo.png'

const isElectron = typeof window !== 'undefined' && !!(window as any).electronAPI

function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [debugMode, setDebugMode] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    logger.info('Login', '=== Component mounted ===')
    const token = localStorage.getItem('auth_token')

    // Electron 模式：不依赖后端 server，直接创建调试 token 进入应用
    if (isElectron && !token) {
      logger.info('Login', 'Electron mode: auto-authenticating')
      localStorage.setItem('auth_token', 'electron-debug-token')
      localStorage.setItem('user_info', JSON.stringify({ id: 'electron', name: '本地用户', email: '', avatar: '', tenantKey: '' }))
      navigate('/')
      return
    }

    if (token) {
      logger.info('Login', 'Already authenticated, redirecting to /')
      navigate('/')
    }

    // Check if debug mode is enabled on server
    fetch('/api/debug/config')
      .then(res => res.json())
      .then(data => { if (data.authDebug) setDebugMode(true) })
      .catch(() => {})
  }, [navigate])

  const handleDebugLogin = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/debug/login', { method: 'POST' })
      const data = await res.json() as { token: string; user: { id: string; name: string; email: string; feishu_id: string; tenant_key: string } }
      if (data.token) {
        localStorage.setItem('auth_token', data.token)
        localStorage.setItem('user_info', JSON.stringify(data.user))
        navigate('/')
      } else {
        setError('调试登录失败')
      }
    } catch {
      setError('网络错误')
    } finally {
      setLoading(false)
    }
  }

  const handleFeishuLogin = async () => {
    logger.info('Login', '=== Feishu login clicked ===')
    setLoading(true)
    setError('')

    try {
      logger.info('Login', 'Fetching /auth/feishu/login...')
      const response = await fetch('/auth/feishu/login')
      const data = await response.json() as { authUrl: string }
      logger.info('Login', `Auth URL received: ${data.authUrl ? 'YES' : 'NO'}`)

      if (data.authUrl) {
        logger.info('Login', 'Redirecting to Feishu...')
        window.location.href = data.authUrl
      } else {
        logger.error('Login', 'No authUrl in response')
        setError('获取登录链接失败')
      }
    } catch (err) {
      logger.error('Login', 'Fetch failed', err)
      setError('网络错误，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-background)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--color-border)] p-8 shadow-2xl gradient-border bg-[var(--color-card-bg)]">
        <div className="mb-6">
          <img src={logoImg} alt="ThunderSoft" className="h-5 w-auto" />
        </div>
        
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-[var(--color-text-primary)] font-mono tracking-wider glow-text">TsCameraTools</h1>
          <p className="mt-2 text-sm text-[var(--color-text-secondary)]">影像开发工具箱</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[var(--color-accent-red)]/10 p-3 text-center text-sm text-[var(--color-accent-red)] border border-[var(--color-accent-red)]/20">
            {error}
          </div>
        )}

        <div className="flex justify-center flex-col gap-3">
          <button
            onClick={handleFeishuLogin}
            disabled={loading}
            className="flex w-full max-w-xs mx-auto items-center justify-center gap-3 rounded-lg bg-[var(--color-primary)] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[var(--color-primary-hover)] disabled:opacity-50 cursor-pointer glow-border"
          >
            {loading ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z" fill="white"/>
              </svg>
            )}
            {loading ? '正在跳转...' : '使用飞书账号登录'}
          </button>
          {debugMode && (
            <button
              onClick={handleDebugLogin}
              disabled={loading}
              className="flex w-full max-w-xs mx-auto items-center justify-center gap-3 rounded-lg border border-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10 px-4 py-3 text-sm font-medium text-[var(--color-accent-orange)] transition-all hover:bg-[var(--color-accent-orange)]/20 disabled:opacity-50 cursor-pointer"
            >
              调试登录（AUTH_DEBUG）
            </button>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-[var(--color-text-secondary)]">
          <p>中科创达企业账号登录</p>
          <p className="mt-1 font-mono">ThunderSoft Enterprise Account</p>
        </div>
      </div>
      <LogViewer />
    </div>
  )
}

export default Login
