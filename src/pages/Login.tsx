import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { logger } from '../utils/logger'
import { LogViewer } from '../components/LogViewer'
import logoImg from '../components/headerLogo.png'

function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    logger.info('Login', '=== Component mounted ===')
    const token = localStorage.getItem('auth_token')
    logger.info('Login', `Existing token: ${token ? 'YES' : 'NO'}`)
    if (token) {
      logger.info('Login', 'Already authenticated, redirecting to /')
      navigate('/')
    }
  }, [navigate])

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
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: '#0F172A' }}>
      <div className="w-full max-w-md rounded-2xl border border-[#334155] p-8 shadow-2xl gradient-border" style={{ backgroundColor: '#1E293B' }}>
        {/* 左上角图标 */}
        <div className="mb-6">
          <img src={logoImg} alt="ThunderSoft" className="h-5 w-auto" />
        </div>
        
        {/* 居中标题 */}
        <div className="mb-8 text-center">
          <h1 className="text-xl font-bold text-white font-mono tracking-wider glow-text">TsCameraTools</h1>
          <p className="mt-2 text-sm text-[#94A3B8]">影像开发工具箱</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-[#EF4444]/10 p-3 text-center text-sm text-[#EF4444] border border-[#EF4444]/20">
            {error}
          </div>
        )}

        {/* 居中按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleFeishuLogin}
            disabled={loading}
            className="flex w-full max-w-xs items-center justify-center gap-3 rounded-lg bg-[#22C55E] px-4 py-3 text-sm font-medium text-white transition-all hover:bg-[#22C55E]/90 disabled:opacity-50 cursor-pointer glow-border"
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
        </div>

        <div className="mt-6 text-center text-xs text-[#475569]">
          <p>中科创达企业账号登录</p>
          <p className="mt-1 font-mono">ThunderSoft Enterprise Account</p>
        </div>
      </div>
      <LogViewer />
    </div>
  )
}

export default Login
