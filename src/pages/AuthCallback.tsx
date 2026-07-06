import { useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { logger } from '../utils/logger'
import { LogViewer } from '../components/LogViewer'

function AuthCallback() {
  useEffect(() => {
    logger.info('AuthCallback', '=== Component mounted ===')
    logger.info('AuthCallback', 'Full URL', window.location.href)
    logger.info('AuthCallback', 'Hash', window.location.hash)
    
    // HashRouter 格式: /#/login/callback?token=xxx
    // token 在 hash 的查询参数中
    const hash = window.location.hash
    const queryStart = hash.indexOf('?')
    const queryString = queryStart >= 0 ? hash.substring(queryStart + 1) : ''
    
    logger.info('AuthCallback', 'Query string from hash', queryString)
    
    const searchParams = new URLSearchParams(queryString)
    const token = searchParams.get('token')
    
    logger.info('AuthCallback', `Token: ${token ? 'YES (' + token.length + ' chars)' : 'NO'}`)
    
    if (token) {
      localStorage.setItem('auth_token', token)
      const stored = localStorage.getItem('auth_token')
      logger.info('AuthCallback', `Stored token: ${stored ? 'OK' : 'FAILED'}`)
      
      try {
        // atob 不支持 UTF-8，需要额外处理中文
        const decoded = decodeURIComponent(escape(atob(token)))
        const user = JSON.parse(decoded)
        localStorage.setItem('user_info', JSON.stringify(user))
        logger.info('AuthCallback', `User: ${user.name} (${user.id})`)
      } catch (err) {
        logger.error('AuthCallback', 'Parse error', err)
      }
      
      // 清除 URL 中的 token（安全考虑）
      window.location.hash = '/'
      // 使用 replace 确保不会回退到 callback URL
      window.location.replace('/')
    } else {
      logger.warn('AuthCallback', 'No token found')
      window.location.hash = '/login'
      window.location.replace('/')
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#1e1e1e]">
      <div className="text-center">
        <Loader2 size={32} className="mx-auto mb-4 animate-spin text-[#3370ff]" />
        <p className="text-sm text-gray-400">正在完成登录...</p>
      </div>
      <LogViewer />
    </div>
  )
}

export default AuthCallback
