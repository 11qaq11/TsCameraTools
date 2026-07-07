import { describe, it, expect, beforeEach } from 'vitest'
import uiReducer, {
  setFontSize,
  setFontFamily,
  setMaximized,
  setFullScreen,
} from '../reducers/ui'

describe('ui reducer', () => {
  let initialState: ReturnType<typeof uiReducer>

  beforeEach(() => {
    initialState = uiReducer(undefined, { type: '@@INIT' })
  })

  describe('字体设置', () => {
    it('应该正确更新字体大小', () => {
      const state = uiReducer(initialState, setFontSize(16))
      expect(state.fontSize).toBe(16)
    })

    it('应该正确更新字体样式', () => {
      const state = uiReducer(initialState, setFontFamily('Arial'))
      expect(state.fontFamily).toBe('Arial')
    })
  })

  describe('窗口状态', () => {
    it('应该正确更新最大化状态', () => {
      const state = uiReducer(initialState, setMaximized(true))
      expect(state.maximized).toBe(true)
    })

    it('应该正确更新全屏状态', () => {
      const state = uiReducer(initialState, setFullScreen(true))
      expect(state.fullScreen).toBe(true)
    })
  })
})
