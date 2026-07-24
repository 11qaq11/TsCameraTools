import { useState, useEffect } from 'react'
import { Users, UserCheck, MessageSquare, AlertTriangle, Activity } from 'lucide-react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface DashboardStats {
  total_users: number
  today_users: number
  total_feedbacks: number
  total_errors: number
  recent_users: { id: number; name: string; email: string; role: string; created_at: string; last_login_at: string }[]
  recent_errors: { id: number; error_type: string; message: string; created_at: string }[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => setStats(data as DashboardStats))
      .catch(err => logger.error('Dashboard', 'Failed to fetch stats:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">仪表盘</h2>
        <div className="text-sm text-[var(--color-text-secondary)]">加载中...</div>
      </div>
    )
  }

  const cards = [
    { label: '注册用户', value: stats?.total_users ?? 0, icon: Users, color: 'text-[var(--color-accent-blue)]', bg: 'bg-[var(--color-accent-blue)]/5' },
    { label: '今日活跃', value: stats?.today_users ?? 0, icon: UserCheck, color: 'text-[var(--color-accent-green)]', bg: 'bg-[var(--color-accent-green)]/5' },
    { label: '用户反馈', value: stats?.total_feedbacks ?? 0, icon: MessageSquare, color: 'text-[var(--color-accent-purple)]', bg: 'bg-[var(--color-accent-purple)]/5' },
    { label: '错误日志', value: stats?.total_errors ?? 0, icon: AlertTriangle, color: 'text-[var(--color-accent-red)]', bg: 'bg-[var(--color-accent-red)]/5' },
  ]

  return (
    <div className="p-6 overflow-y-auto">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">仪表盘</h2>

      {/* 统计卡片 */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {cards.map(c => (
          <div key={c.label} className={`rounded-xl border border-[var(--color-border)] ${c.bg} p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-[var(--color-text-secondary)]">{c.label}</span>
              <c.icon size={20} className={c.color} />
            </div>
            <div className={`text-2xl font-bold font-mono ${c.color}`}>
              {c.value.toLocaleString()}
            </div>
          </div>
        ))}
      </div>

      {/* 最近用户 / 最近错误 */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <Activity size={16} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">最近注册用户</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {stats?.recent_users.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">暂无</div>
            ) : stats?.recent_users.map(u => (
              <div key={u.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 text-[var(--color-text-primary)]">{u.name}</span>
                <span className="text-xs text-[var(--color-text-secondary)]">{u.email}</span>
                <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                  {new Date(u.created_at).toLocaleDateString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[var(--color-border)]">
            <AlertTriangle size={16} className="text-[var(--color-text-secondary)]" />
            <span className="text-sm font-medium text-[var(--color-text-primary)]">最近错误</span>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {stats?.recent_errors.length === 0 ? (
              <div className="px-4 py-4 text-xs text-[var(--color-text-secondary)]">暂无错误</div>
            ) : stats?.recent_errors.map(e => (
              <div key={e.id} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span className="flex-1 text-[var(--color-text-primary)] truncate">{e.message}</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                  e.error_type === 'crash' ? 'text-[var(--color-accent-red)] bg-[var(--color-accent-red)]/10' : 'text-[var(--color-accent-orange)] bg-[var(--color-accent-orange)]/10'
                }`}>{e.error_type}</span>
                <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                  {new Date(e.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
