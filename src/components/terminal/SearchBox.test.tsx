import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '../../test/test-utils'
import SearchBox from '../../components/terminal/SearchBox'
import { setupElectronAPI, resetMocks } from '../../test/mock-utils'

describe('SearchBox', () => {
  const defaultProps = {
    visible: true,
    query: '',
    results: { current: 0, total: 0 },
    onQueryChange: vi.fn(),
    onNext: vi.fn(),
    onPrevious: vi.fn(),
    onClose: vi.fn(),
  }

  beforeEach(() => {
    setupElectronAPI()
    resetMocks()
    vi.clearAllMocks()
  })

  it('应该在 visible 为 true 时显示', () => {
    render(<SearchBox {...defaultProps} />)
    expect(screen.getByPlaceholderText('搜索...')).toBeInTheDocument()
  })

  it('应该在 visible 为 false 时隐藏', () => {
    render(<SearchBox {...defaultProps} visible={false} />)
    expect(screen.queryByPlaceholderText('搜索...')).not.toBeInTheDocument()
  })

  it('应该正确显示搜索结果计数', () => {
    render(<SearchBox {...defaultProps} results={{ current: 1, total: 5 }} />)
    expect(screen.getByText('1/5')).toBeInTheDocument()
  })

  it('应该在输入时调用 onQueryChange', () => {
    render(<SearchBox {...defaultProps} />)
    const input = screen.getByPlaceholderText('搜索...')
    fireEvent.change(input, { target: { value: 'test' } })
    expect(defaultProps.onQueryChange).toHaveBeenCalledWith('test')
  })

  it('应该在点击下一个按钮时调用 onNext', () => {
    render(<SearchBox {...defaultProps} />)
    const nextButton = screen.getByRole('button', { name: /下一个/i })
    fireEvent.click(nextButton)
    expect(defaultProps.onNext).toHaveBeenCalled()
  })

  it('应该在点击上一个按钮时调用 onPrevious', () => {
    render(<SearchBox {...defaultProps} />)
    const prevButton = screen.getByRole('button', { name: /上一个/i })
    fireEvent.click(prevButton)
    expect(defaultProps.onPrevious).toHaveBeenCalled()
  })

  it('应该在点击关闭按钮时调用 onClose', () => {
    render(<SearchBox {...defaultProps} />)
    const closeButton = screen.getByRole('button', { name: /关闭/i })
    fireEvent.click(closeButton)
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
