import { logger } from './logger'

export interface User {
  id: string
  name: string
  email: string
  avatar: string
  tenantKey: string
}

export function getAuthToken(): string | null {
  const token = localStorage.getItem('auth_token')
  logger.info('Auth', `getAuthToken: ${token ? 'found(' + token.length + ' chars)' : 'null'}`)
  return token
}

export function getUserInfo(): User | null {
  const userInfo = localStorage.getItem('user_info')
  if (userInfo) {
    try {
      const user = JSON.parse(userInfo)
      logger.info('Auth', `getUserInfo: ${user.name} (${user.id})`)
      return user
    } catch (err) {
      logger.error('Auth', 'getUserInfo: parse failed', err)
      return null
    }
  }
  logger.info('Auth', 'getUserInfo: null')
  return null
}

export function isAuthenticated(): boolean {
  const token = getAuthToken()
  const result = !!token
  logger.info('Auth', `isAuthenticated: ${result}`)
  return result
}

export function logout(): void {
  logger.info('Auth', 'logout: clearing storage')
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user_info')
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken()
  
  const headers: Record<string, string> = {
    ...options.headers as Record<string, string>,
    'Content-Type': 'application/json'
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  logger.info('API', `${options.method || 'GET'} ${url}`, { hasToken: !!token })
  return fetch(url, {
    ...options,
    headers
  })
}
