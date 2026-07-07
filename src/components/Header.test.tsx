import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from '../store'
import Header from './Header'

describe('Header', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染标题', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Header />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByText('设备连接')).toBeInTheDocument()
  })

  it('应该显示用户信息', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Header />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
  })
})
