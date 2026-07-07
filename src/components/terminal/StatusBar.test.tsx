import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBar from './StatusBar'

describe('StatusBar', () => {
  const defaultProps = {
    connected: true,
    cols: 80,
    rows: 24,
    serial: 'device-1',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染状态栏', () => {
    render(<StatusBar {...defaultProps} />)
    expect(screen.getByText(/80.*24/)).toBeInTheDocument()
  })

  it('应该显示设备序列号', () => {
    render(<StatusBar {...defaultProps} />)
    expect(screen.getByText(/device-1/)).toBeInTheDocument()
  })
})
