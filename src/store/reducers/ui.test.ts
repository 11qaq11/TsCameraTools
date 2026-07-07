import { describe, it, expect, beforeEach } from 'vitest'
import uiReducer, {
  setFontSize,
  setFontFamily,
  setCursorShape,
  setCursorBlink,
  setScrollback,
  setCopyOnSelect,
  setPadding,
  setForegroundColor,
  setBackgroundColor,
  setCursorColor,
  setSelectionColor,
  setBorderColor,
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

  describe('终端配置', () => {
    it('应该正确更新光标样式', () => {
      const state = uiReducer(initialState, setCursorShape('BEAM'))
      expect(state.cursorShape).toBe('BEAM')
    })

    it('应该正确更新光标闪烁', () => {
      const state = uiReducer(initialState, setCursorBlink(true))
      expect(state.cursorBlink).toBe(true)
    })

    it('应该正确更新滚动行数', () => {
      const state = uiReducer(initialState, setScrollback(5000))
      expect(state.scrollback).toBe(5000)
    })

    it('应该正确更新选中复制', () => {
      const state = uiReducer(initialState, setCopyOnSelect(true))
      expect(state.copyOnSelect).toBe(true)
    })

    it('应该正确更新内边距', () => {
      const state = uiReducer(initialState, setPadding('16px'))
      expect(state.padding).toBe('16px')
    })
  })

  describe('颜色设置', () => {
    it('应该正确更新前景色', () => {
      const state = uiReducer(initialState, setForegroundColor('#ffffff'))
      expect(state.foregroundColor).toBe('#ffffff')
    })

    it('应该正确更新背景色', () => {
      const state = uiReducer(initialState, setBackgroundColor('#000000'))
      expect(state.backgroundColor).toBe('#000000')
    })

    it('应该正确更新光标颜色', () => {
      const state = uiReducer(initialState, setCursorColor('#ff0000'))
      expect(state.cursorColor).toBe('#ff0000')
    })

    it('应该正确更新选中色', () => {
      const state = uiReducer(initialState, setSelectionColor('#0000ff'))
      expect(state.selectionColor).toBe('#0000ff')
    })

    it('应该正确更新边框色', () => {
      const state = uiReducer(initialState, setBorderColor('#333333'))
      expect(state.borderColor).toBe('#333333')
    })
  })
})
