import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '../../test/test-utils'
import TerminalHeader from '../../components/terminal/Header'
import { setupElectronAPI, resetMocks } from '../../test/mock-utils'

describe('TerminalHeader', () => {
  const defaultProps = {
    serial: 'device-1',
    maximized: false,
    onSearch: vi.fn(),
    onCopy: vi.fn(),
    onPaste: vi.fn(),
    onMaximize: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    setupElectronAPI()
    resetMocks()
    vi.clearAllMocks()
  })

  it('应该正确渲染终端头部', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByText(/device-1/)).toBeInTheDocument()
  })

  it('应该显示搜索按钮', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /搜索/i })).toBeInTheDocument()
  })

  it('应该显示复制按钮', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /复制/i })).toBeInTheDocument()
  })

  it('应该显示粘贴按钮', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /粘贴/i })).toBeInTheDocument()
  })

  it('应该显示最大化按钮', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /最大化/i })).toBeInTheDocument()
  })

  it('应该显示关闭按钮', () => {
    render(<TerminalHeader {...defaultProps} />)
    expect(screen.getByRole('button', { name: /关闭/i })).toBeInTheDocument()
  })

  it('应该在点击搜索按钮时调用 onSearch', () => {
    render(<TerminalHeader {...defaultProps} />)
    const searchButton = screen.getByRole('button', { name: /搜索/i })
    fireEvent.click(searchButton)
    expect(defaultProps.onSearch).toHaveBeenCalled()
  })

  it('应该在点击复制按钮时调用 onCopy', () => {
    render(<TerminalHeader {...defaultProps} />)
    const copyButton = screen.getByRole('button', { name: /复制/i })
    fireEvent.click(copyButton)
    expect(defaultProps.onCopy).toHaveBeenCalled()
  })

  it('应该在点击粘贴按钮时调用 onPaste', () => {
    render(<TerminalHeader {...defaultProps} />)
    const pasteButton = screen.getByRole('button', { name: /粘贴/i })
    fireEvent.click(pasteButton)
    expect(defaultProps.onPaste).toHaveBeenCalled()
  })

  it('应该在点击最大化按钮时调用 onMaximize', () => {
    render(<TerminalHeader {...defaultProps} />)
    const maximizeButton = screen.getByRole('button', { name: /最大化/i })
    fireEvent.click(maximizeButton)
    expect(defaultProps.onMaximize).toHaveBeenCalled()
  })

  it('应该在点击关闭按钮时调用 onClose', () => {
    render(<TerminalHeader {...defaultProps} />)
    const closeButton = screen.getByRole('button', { name: /关闭/i })
    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
