import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LocalTerminal from './LocalTerminal'

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('../utils/auth', () => ({
  fetchWithAuth: vi.fn(),
}))

import { fetchWithAuth } from '../utils/auth'

describe('LocalTerminal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('初始显示加载状态', () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'mock' }),
    } as Response)

    render(<LocalTerminal />)
    expect(screen.getByText('正在启动终端...')).toBeInTheDocument()
  })

  it('启动失败显示错误和重试按钮', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: false, error: 'Terminal not found' }),
    } as Response)

    render(<LocalTerminal />)

    await waitFor(() => {
      expect(screen.getByText('终端启动失败')).toBeInTheDocument()
    })
    expect(screen.getByText('Terminal not found')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
  })

  it('启动成功渲染 iframe', async () => {
    vi.mocked(fetchWithAuth).mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, url: 'http://localhost:7681', sessionId: 's1' }),
    } as Response)

    render(<LocalTerminal />)

    await waitFor(() => {
      expect(screen.getByTitle('Local Terminal')).toBeInTheDocument()
    })
    expect(screen.getByText('断开连接')).toBeInTheDocument()
  })

  it('网络错误显示错误信息', async () => {
    vi.mocked(fetchWithAuth).mockRejectedValueOnce(new Error('Network error'))

    render(<LocalTerminal />)

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument()
    })
  })

  it('重试按钮调用 startTtyd', async () => {
    vi.mocked(fetchWithAuth)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: false, error: 'fail' }),
      } as Response)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, url: 'http://localhost:7681', sessionId: 's1' }),
      } as Response)

    render(<LocalTerminal />)

    await waitFor(() => {
      expect(screen.getByText('重试')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByText('重试'))

    await waitFor(() => {
      expect(fetchWithAuth).toHaveBeenCalledTimes(2)
    })
  })
})
