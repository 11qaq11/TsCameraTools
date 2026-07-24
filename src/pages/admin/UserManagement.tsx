import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface User {
  id: number
  name: string
  email: string
  feishu_id: string
  tenant_key: string
  role: string
  created_at: string
  last_login_at: string
}

const ROLE_LABELS: Record<string, string> = { owner: 'Owner', admin: 'Admin', user: 'User' }
const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-[var(--color-accent-orange)]/10 text-[var(--color-accent-orange)]',
  admin: 'bg-[var(--color-accent-blue)]/10 text-[var(--color-accent-blue)]',
  user: 'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]',
}

function getUserRole(): string {
  try {
    const info = localStorage.getItem('user_info')
    if (!info) return 'user'
    const user = JSON.parse(info)
    return user.role || 'user'
  } catch { return 'user' }
}

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const currentRole = getUserRole()

  const fetchUsers = () => {
    fetchWithAuth('/api/user/list')
      .then(res => res.json())
      .then(data => setUsers(data.users as User[]))
      .catch(err => logger.error('Admin', 'Failed to fetch users:', err))
  }

  useEffect(() => { fetchUsers(); setLoading(false) }, [])

  const handleRoleChange = async (userId: number, newRole: string) => {
    try {
      const res = await fetchWithAuth(`/api/user/${userId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      })
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      } else {
        const err = await res.json()
        logger.error('Admin', `Role change failed: ${err.error}`)
      }
    } catch (err) {
      logger.error('Admin', 'Role change error:', err)
    }
  }

  const canEdit = currentRole === 'owner' || currentRole === 'admin'

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">用户管理</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] bg-[var(--color-background)]">
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">ID</th>
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">姓名</th>
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">邮箱</th>
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">飞书 ID</th>
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">权限</th>
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">最后登录</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">加载中...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">暂无用户数据</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-sidebar-hover)]">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs truncate max-w-[120px]">{u.feishu_id}</td>
                  <td className="px-4 py-3">
                    {canEdit && u.role !== 'owner' ? (
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2 py-0.5 text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg)] text-[var(--color-text-primary)] cursor-pointer"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                        {currentRole === 'owner' && <option value="owner">Owner</option>}
                      </select>
                    ) : (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] || ROLE_COLORS.user}`}>
                        {ROLE_LABELS[u.role] || 'User'}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-text-secondary)]">
                    {u.last_login_at ? new Date(u.last_login_at).toLocaleString('zh-CN') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
