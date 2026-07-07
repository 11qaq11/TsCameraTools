import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Provider } from 'react-redux'
import { store } from '../store'
import { LogViewer } from './LogViewer'

describe('LogViewer', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染日志查看器按钮', () => {
    render(
      <Provider store={store}>
        <LogViewer />
      </Provider>
    )
    expect(screen.getByTitle('查看操作日志')).toBeInTheDocument()
  })

  it('应该在点击按钮后显示日志面板', async () => {
    render(
      <Provider store={store}>
        <LogViewer />
      </Provider>
    )
    const button = screen.getByTitle('查看操作日志')
    fireEvent.click(button)
    expect(screen.getByText('操作日志')).toBeInTheDocument()
  })
})
