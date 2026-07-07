import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'

vi.mock('../../utils/auth', () => ({
  fetchWithAuth: vi.fn(),
}))

import TtydTerminal from './TtydTerminal'
import { fetchWithAuth } from '../../utils/auth'

const mockFetch = vi.mocked(fetchWithAuth)

describe('TtydTerminal', () => {
  const defaultProps = {
    serial: 'device-1',
    onClose: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该显示加载状态', () => {
    mockFetch.mockResolvedValue(new Response('{}'))
    render(<TtydTerminal {...defaultProps} />)
    expect(screen.getByText('正在连接终端...')).toBeInTheDocument()
  })

  it('ttyd 启动成功后应该显示 iframe', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, url: 'http://localhost:7681', sessionId: 'test-id' }))
    )
    render(<TtydTerminal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTitle('ttyd - device-1')).toBeInTheDocument()
    })
  })

  it('ttyd 启动失败应该显示错误信息', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'binary not found' }))
    )
    render(<TtydTerminal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('终端连接失败')).toBeInTheDocument()
    })
  })

  it('应该显示重试按钮', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: false, error: 'error' }))
    )
    render(<TtydTerminal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('重试')).toBeInTheDocument()
    })
  })

  it('应该显示断开连接按钮', async () => {
    mockFetch.mockResolvedValue(
      new Response(JSON.stringify({ success: true, url: 'http://localhost:7681', sessionId: 'test-id' }))
    )
    render(<TtydTerminal {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByText('断开连接')).toBeInTheDocument()
    })
  })
})
