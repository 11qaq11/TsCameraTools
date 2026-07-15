import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

vi.mock('./utils/auth', () => ({
  isAuthenticated: vi.fn(() => false),
  getAuthToken: vi.fn(() => null),
}))

vi.mock('./utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

describe('App routing', () => {
  it('未认证用户访问 / 被重定向到 /login', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('使用飞书账号登录')).toBeInTheDocument()
    })
  })

  it('/login 路由渲染登录页', async () => {
    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('使用飞书账号登录')).toBeInTheDocument()
    })
  })

  it('/login/callback 路由渲染回调页', async () => {
    Object.defineProperty(window, 'location', {
      value: { ...window.location, hash: '#/login/callback', replace: vi.fn() },
      writable: true,
    })

    render(
      <MemoryRouter initialEntries={['/login/callback']}>
        <App />
      </MemoryRouter>
    )
    await waitFor(() => {
      expect(screen.getByText('正在完成登录...')).toBeInTheDocument()
    })
  })
})
