import { useState } from 'react'
import { MessageSquare, Send, CheckCircle } from 'lucide-react'

const CATEGORIES = [
  { value: 'bug', label: '问题反馈' },
  { value: 'feature', label: '功能建议' },
  { value: 'other', label: '其他' },
]

const SERVER_URL = 'http://122.51.90.193'

export default function Feedback() {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [category, setCategory] = useState('bug')
  const [contact, setContact] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) return
    setSending(true)
    setError('')
    try {
      const res = await fetch(`${SERVER_URL}/api/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category, contact: contact.trim() }),
      })
      if (!res.ok) throw new Error(await res.text())
      setSent(true)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (sent) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <CheckCircle size={48} className="text-[var(--color-accent-green)]" />
        <p className="text-lg font-medium text-[var(--color-text-primary)]">反馈已提交</p>
        <p className="text-sm text-[var(--color-text-secondary)]">感谢您的反馈！</p>
        <button
          onClick={() => { setSent(false); setTitle(''); setContent('') }}
          className="px-4 py-2 text-sm rounded-lg bg-[var(--color-accent-green)] text-white hover:bg-[var(--color-accent-green)]/90 cursor-pointer"
        >
          继续反馈
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full p-6 max-w-2xl mx-auto w-full">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare size={20} className="text-[var(--color-text-secondary)]" />
        <div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">用户反馈</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">提交问题或功能建议</p>
        </div>
      </div>

      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">分类</label>
          <div className="flex gap-2">
            {CATEGORIES.map(c => (
              <button
                key={c.value}
                onClick={() => setCategory(c.value)}
                className={`px-3 py-1.5 text-sm rounded-lg border cursor-pointer transition-colors ${
                  category === c.value
                    ? 'bg-[var(--color-accent-green)]/10 border-[var(--color-accent-green)] text-[var(--color-accent-green)]'
                    : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">标题 *</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="简要描述问题或建议"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-green)]"
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">详细描述 *</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请详细描述您遇到的问题或建议..."
            rows={6}
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-green)] resize-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">联系方式（选填）</label>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="企业微信 / 邮箱"
            className="w-full px-3 py-2 text-sm rounded-lg bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-green)]"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--color-accent-red)]/30 bg-[var(--color-accent-red)]/10 px-4 py-2 text-sm text-[var(--color-accent-red)]">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={!title.trim() || !content.trim() || sending}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[var(--color-accent-green)] text-sm font-medium text-white hover:bg-[var(--color-accent-green)]/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          <Send size={16} />
          {sending ? '提交中...' : '提交反馈'}
        </button>
      </div>
    </div>
  )
}
