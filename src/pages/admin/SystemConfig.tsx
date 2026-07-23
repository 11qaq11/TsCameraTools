import { useState } from 'react'
import { logger } from '../../utils/logger'

interface ConfigEntry {
  key: string
  value: string
  description: string
}

const defaultConfigs: ConfigEntry[] = [
  { key: 'PORT', value: '3000', description: '服务器端口' },
  { key: 'SESSION_EXPIRY_HOURS', value: '24', description: '会话过期时间（小时）' },
  { key: 'AUTH_DEBUG', value: 'false', description: '认证调试模式（true 跳过 OAuth）' },
  { key: 'ADB_PATH', value: 'adb', description: 'ADB 可执行文件路径' },
  { key: 'DATABASE_URL', value: '(隐藏)', description: 'PostgreSQL 连接字符串' },
]

export default function SystemConfig() {
  const [configs] = useState<ConfigEntry[]>(defaultConfigs)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    // ponytail: 后续接入后端 /api/config 接口
    setSaved(true)
    logger.info('Admin', 'Config saved')
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">系统配置</h2>
        <div className="flex items-center gap-3">
          {saved && <span className="text-xs text-[var(--color-accent-green)]">保存成功</span>}
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm bg-[var(--color-accent-green)] text-white rounded-lg hover:bg-[var(--color-accent-green)]/90 cursor-pointer"
          >
            保存配置
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        <div className="divide-y divide-[var(--color-border)]">
          {configs.map(c => (
            <div key={c.key} className="flex items-center px-4 py-3 gap-4">
              <div className="w-48 shrink-0">
                <p className="text-sm font-mono font-medium text-[var(--color-text-primary)]">{c.key}</p>
                <p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{c.description}</p>
              </div>
              <input
                type="text"
                defaultValue={c.value}
                className="flex-1 px-3 py-2 text-sm bg-[var(--color-background)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] font-mono outline-none focus:border-[var(--color-accent-blue)]"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
