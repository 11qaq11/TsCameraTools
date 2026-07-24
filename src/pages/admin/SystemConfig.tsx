import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface ConfigEntry {
  key: string
  value: string
  description: string
}

const CONFIG_DESCRIPTIONS: Record<string, string> = {
  port: '服务器端口',
  https: '是否启用 HTTPS',
  frontendUrl: '前端地址',
  sessionExpiryHours: '会话过期时间（小时）',
  authDebug: '认证调试模式',
  adbPath: 'ADB 可执行文件路径',
  ttydPortRange: 'ttyd 端口范围',
  databaseUrl: 'PostgreSQL 连接字符串',
}

export default function SystemConfig() {
  const [configs, setConfigs] = useState<ConfigEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWithAuth('/api/debug/config')
      .then(res => res.json())
      .then(data => {
        const entries: ConfigEntry[] = Object.entries(data).map(([key, value]) => ({
          key,
          value: String(value),
          description: CONFIG_DESCRIPTIONS[key] || key,
        }))
        setConfigs(entries)
      })
      .catch(err => logger.error('Admin', 'Failed to fetch config:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">系统配置</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        <div className="divide-y divide-[var(--color-border)]">
          {loading ? (
            <div className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">加载中...</div>
          ) : configs.map(c => (
            <div key={c.key} className="flex items-center px-4 py-3 gap-4">
              <div className="w-48 shrink-0">
                <p className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{c.key}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{c.description}</p>
              </div>
              <span className="flex-1 px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] font-mono">
                {c.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
