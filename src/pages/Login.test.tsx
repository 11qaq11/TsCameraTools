import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    vi.stubGlobal('fetch', vi.fn())
  })

  const renderLogin = () =>
    render(<MemoryRouter><Login /></MemoryRouter>)

  it('已登录时重定向到 /', () => {
    localStorage.setItem('auth_token', 'token')
    renderLogin()
    expect(mockNavigate).toHaveBeenCalledWith('/')
  })

  it('渲染登录按钮', () => {
    renderLogin()
    expect(screen.getByText('使用飞书账号登录')).toBeInTheDocument()
  })

  it('渲染标题', () => {
    renderLogin()
    expect(screen.getByText('TsCameraTools')).toBeInTheDocument()
  })

  it('点击登录调用 fetch 获取 authUrl', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({ authUrl: 'https://feishu.cn/auth' }),
    } as Response)

    renderLogin()
    await userEvent.click(screen.getByText('使用飞书账号登录'))

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/auth/feishu/login')
    })
  })

  it('fetch 失败时显示错误', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'))

    renderLogin()
    await userEvent.click(screen.getByText('使用飞书账号登录'))

    await waitFor(() => {
      expect(screen.getByText('网络错误，请稍后重试')).toBeInTheDocument()
    })
  })

  it('响应无 authUrl 时显示错误', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      json: () => Promise.resolve({}),
    } as Response)

    renderLogin()
    await userEvent.click(screen.getByText('使用飞书账号登录'))

    await waitFor(() => {
      expect(screen.getByText('获取登录链接失败')).toBeInTheDocument()
    })
  })
})
