// useSearch hook - 管理终端搜索功能
// 参考: Hyper 的搜索功能

import { useState, useCallback, useRef } from 'react'
import { logger } from '../utils/logger'

interface UseSearchOptions {
  termRef: React.RefObject<HTMLDivElement>
}

export function useSearch({ termRef }: UseSearchOptions) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ current: number; total: number }>({ current: 0, total: 0 })
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 打开搜索框
  const openSearch = useCallback(() => {
    setShowSearch(true)
    logger.info('Search', 'Opened')
  }, [])

  // 关闭搜索框
  const closeSearch = useCallback(() => {
    setShowSearch(false)
    setSearchQuery('')
    setSearchResults({ current: 0, total: 0 })
    // 清除搜索高亮
    if (termRef.current) {
      const clearSearch = (termRef.current as any).termClearSearch
      if (clearSearch) clearSearch()
    }
    logger.info('Search', 'Closed')
  }, [termRef])

  // 执行搜索
  const doSearch = useCallback((query: string) => {
    setSearchQuery(query)
    
    if (!query) {
      setSearchResults({ current: 0, total: 0 })
      if (termRef.current) {
        const clearSearch = (termRef.current as any).termClearSearch
        if (clearSearch) clearSearch()
      }
      return
    }

    // 防抖搜索
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current)
    }
    searchDebounceRef.current = setTimeout(() => {
      if (termRef.current) {
        const search = (termRef.current as any).termSearch
        if (search) {
          search(query)
          // 注意: xterm-addon-search 不返回结果数量
          // 需要通过其他方式获取
          logger.info('Search', `Searching: ${query}`)
        }
      }
    }, 100)
  }, [termRef])

  // 搜索下一个
  const searchNext = useCallback(() => {
    if (termRef.current) {
      const searchNextFn = (termRef.current as any).termSearchNext
      if (searchNextFn) {
        searchNextFn()
        logger.info('Search', 'Next result')
      }
    }
  }, [termRef])

  // 搜索上一个
  const searchPrevious = useCallback(() => {
    if (termRef.current) {
      const searchPreviousFn = (termRef.current as any).termSearchPrevious
      if (searchPreviousFn) {
        searchPreviousFn()
        logger.info('Search', 'Previous result')
      }
    }
  }, [termRef])

  return {
    showSearch,
    searchQuery,
    searchResults,
    openSearch,
    closeSearch,
    doSearch,
    searchNext,
    searchPrevious
  }
}
