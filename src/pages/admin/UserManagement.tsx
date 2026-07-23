import { useState } from 'react'

interface User {
  id: number
  name: string
  email: string
  feishu_id: string
  tenant_key: string
}

export default function UserManagement() {
  const [users] = useState<User[]>([])

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
              <th className="text-left px-4 py-3 text-[var(--color-text-secondary)] font-medium">租户</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-secondary)]">暂无用户数据</td>
              </tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-sidebar-hover)]">
                  <td className="px-4 py-3 font-mono text-xs">{u.id}</td>
                  <td className="px-4 py-3">{u.name}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{u.email}</td>
                  <td className="px-4 py-3 font-mono text-xs">{u.feishu_id}</td>
                  <td className="px-4 py-3 text-[var(--color-text-secondary)]">{u.tenant_key}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
