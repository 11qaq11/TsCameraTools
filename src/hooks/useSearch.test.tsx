import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

vi.mock('../utils/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

import { useSearch } from './useSearch'

const createMockTermRef = () => ({
  current: {
    termSearch: vi.fn(),
    termClearSearch: vi.fn(),
    termSearchNext: vi.fn(),
    termSearchPrevious: vi.fn(),
  } as unknown as HTMLDivElement & Record<string, unknown>,
})

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('初始状态正确', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    expect(result.current.showSearch).toBe(false)
    expect(result.current.searchQuery).toBe('')
    expect(result.current.searchResults).toEqual({ current: 0, total: 0 })
  })

  it('openSearch 设置 showSearch 为 true', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.openSearch() })
    expect(result.current.showSearch).toBe(true)
  })

  it('closeSearch 重置所有状态', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.openSearch() })
    act(() => { result.current.doSearch('test') })
    act(() => { result.current.closeSearch() })

    expect(result.current.showSearch).toBe(false)
    expect(result.current.searchQuery).toBe('')
    expect(result.current.searchResults).toEqual({ current: 0, total: 0 })
    expect(termRef.current.termClearSearch).toHaveBeenCalled()
  })

  it('doSearch 空字符串时立即清除', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.doSearch('') })
    expect(result.current.searchQuery).toBe('')
    expect(termRef.current.termClearSearch).toHaveBeenCalled()
  })

  it('doSearch 有防抖延迟 100ms', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.doSearch('hello') })
    expect(termRef.current.termSearch).not.toHaveBeenCalled()

    act(() => { vi.advanceTimersByTime(100) })
    expect(termRef.current.termSearch).toHaveBeenCalledWith('hello')
  })

  it('searchNext 调用 termSearchNext', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.searchNext() })
    expect(termRef.current.termSearchNext).toHaveBeenCalled()
  })

  it('searchPrevious 调用 termSearchPrevious', () => {
    const termRef = createMockTermRef()
    const { result } = renderHook(() => useSearch({ termRef: termRef as any }))

    act(() => { result.current.searchPrevious() })
    expect(termRef.current.termSearchPrevious).toHaveBeenCalled()
  })
})
