import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAuthToken, getUserInfo, logout as logoutUtil, type User } from '../utils/auth'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const token = getAuthToken()
    const userInfo = getUserInfo()

    if (token && userInfo) {
      setUser(userInfo)
    }
    setLoading(false)
  }, [])

  const logout = () => {
    logoutUtil()
    setUser(null)
    navigate('/login')
  }

  return {
    user,
    loading,
    isAuthenticated: !!user,
    logout
  }
}
