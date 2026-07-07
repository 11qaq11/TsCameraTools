import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import ErrorBoundary from './ErrorBoundary'

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该在子组件正常时渲染子组件', () => {
    render(
      <ErrorBoundary>
        <div>Test Content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Test Content')).toBeInTheDocument()
  })

  it('应该在子组件出错时显示错误信息', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('组件渲染错误')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })

  it('应该提供重试按钮', () => {
    const ThrowError = () => {
      throw new Error('Test error')
    }

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    )

    expect(screen.getByText('重试')).toBeInTheDocument()
    consoleSpy.mockRestore()
  })
})
