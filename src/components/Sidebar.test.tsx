import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from '../store'
import Sidebar from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染 Logo 和应用名称', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Sidebar />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByText('TsCameraTools')).toBeInTheDocument()
  })

  it('应该渲染导航菜单项', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Sidebar />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByText('设备连接')).toBeInTheDocument()
  })

  it('应该渲染版本号', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Sidebar />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByText('v0.1.0')).toBeInTheDocument()
  })

  it('应该渲染折叠按钮', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Sidebar />
        </HashRouter>
      </Provider>
    )
    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()
  })
})
