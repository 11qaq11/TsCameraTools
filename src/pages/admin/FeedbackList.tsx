import { useState, useEffect } from 'react'
import { fetchWithAuth } from '../../utils/auth'
import { logger } from '../../utils/logger'

interface FeedbackEntry {
  id: number
  user_name: string
  category: string
  title: string
  content: string
  contact: string
  device_model: string
  created_at: string
}

const CATEGORY_LABELS: Record<string, string> = {
  bug: '问题',
  feature: '建议',
  other: '其他',
}

export default function FeedbackList() {
  const [feedbacks, setFeedbacks] = useState<FeedbackEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<number | null>(null)

  useEffect(() => {
    fetchWithAuth('/api/feedback/list')
      .then(res => res.json())
      .then(data => setFeedbacks(data.feedbacks as FeedbackEntry[]))
      .catch(err => logger.error('Admin', 'Failed to fetch feedbacks:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">用户反馈</h2>
      <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card-bg)] overflow-hidden">
        {loading ? (
          <p className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">加载中...</p>
        ) : feedbacks.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--color-text-secondary)] text-sm">暂无反馈数据</p>
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {feedbacks.map(f => (
              <div key={f.id} className="hover:bg-[var(--color-sidebar-hover)] transition-colors">
                <div
                  onClick={() => setExpanded(expanded === f.id ? null : f.id)}
                  className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                >
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                    f.category === 'bug' ? 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]' :
                    f.category === 'feature' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]' :
                    'bg-[var(--color-text-secondary)]/10 text-[var(--color-text-secondary)]'
                  }`}>
                    {CATEGORY_LABELS[f.category] || f.category}
                  </span>
                  <span className="flex-1 text-sm text-[var(--color-text-primary)] truncate">{f.title}</span>
                  <span className="text-xs text-[var(--color-text-secondary)]">{f.user_name || '匿名'}</span>
                  <span className="text-xs text-[var(--color-text-secondary)] font-mono">
                    {new Date(f.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>
                {expanded === f.id && (
                  <div className="px-4 pb-3 space-y-2">
                    <p className="text-sm text-[var(--color-text-primary)] whitespace-pre-wrap">{f.content}</p>
                    <div className="flex gap-4 text-xs text-[var(--color-text-secondary)]">
                      {f.contact && <span>联系方式: {f.contact}</span>}
                      {f.device_model && <span>设备: {f.device_model}</span>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
