// UI Reducer - 管理终端 UI 状态
// 参考: https://github.com/vercel/hyper/blob/canary/lib/reducers/ui.ts

import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import type { UiState, ColorTheme } from '../../types/hyper'
import { DEFAULT_UI_STATE, DARK_THEME } from '../../config/default'

const initialState: UiState = {
  ...DEFAULT_UI_STATE,
  ...DARK_THEME
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    // 字体大小
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload
    },
    resetFontSize: (state) => {
      state.fontSize = DEFAULT_UI_STATE.fontSize
    },
    
    // 字体族
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.fontFamily = action.payload
    },
    
    // 光标形状
    setCursorShape: (state, action: PayloadAction<'BLOCK' | 'BEAM' | 'UNDERLINE'>) => {
      state.cursorShape = action.payload
    },
    
    // 光标闪烁
    setCursorBlink: (state, action: PayloadAction<boolean>) => {
      state.cursorBlink = action.payload
    },
    
    // 光标颜色
    setCursorColor: (state, action: PayloadAction<string>) => {
      state.cursorColor = action.payload
    },
    
    // 前景色
    setForegroundColor: (state, action: PayloadAction<string>) => {
      state.foregroundColor = action.payload
    },
    
    // 背景色
    setBackgroundColor: (state, action: PayloadAction<string>) => {
      state.backgroundColor = action.payload
    },
    
    // 选中颜色
    setSelectionColor: (state, action: PayloadAction<string>) => {
      state.selectionColor = action.payload
    },
    
    // 边框颜色
    setBorderColor: (state, action: PayloadAction<string>) => {
      state.borderColor = action.payload
    },
    
    // 颜色主题
    setColors: (state, action: PayloadAction<ColorTheme>) => {
      state.colors = action.payload
    },
    
    // 滚动行数
    setScrollback: (state, action: PayloadAction<number>) => {
      state.scrollback = action.payload
    },
    
    // 内边距
    setPadding: (state, action: PayloadAction<string>) => {
      state.padding = action.payload
    },
    
    // WebGL 渲染器
    setWebGLRenderer: (state, action: PayloadAction<boolean>) => {
      state.webGLRenderer = action.payload
    },
    
    // 复制时选中
    setCopyOnSelect: (state, action: PayloadAction<boolean>) => {
      state.copyOnSelect = action.payload
    },
    
    // 响铃
    setBell: (state, action: PayloadAction<boolean>) => {
      state.bell = action.payload
    },
    
    // 窗口最大化
    setMaximized: (state, action: PayloadAction<boolean>) => {
      state.maximized = action.payload
    },
    
    // 全屏
    setFullScreen: (state, action: PayloadAction<boolean>) => {
      state.fullScreen = action.payload
    },
    
    // 应用完整配置
    applyConfig: (state, action: PayloadAction<Partial<UiState>>) => {
      return { ...state, ...action.payload }
    },
    
    // 重置为默认值
    resetToDefaults: () => {
      return { ...DEFAULT_UI_STATE, ...DARK_THEME }
    }
  }
})

export const {
  setFontSize,
  resetFontSize,
  setFontFamily,
  setCursorShape,
  setCursorBlink,
  setCursorColor,
  setForegroundColor,
  setBackgroundColor,
  setSelectionColor,
  setBorderColor,
  setColors,
  setScrollback,
  setPadding,
  setWebGLRenderer,
  setCopyOnSelect,
  setBell,
  setMaximized,
  setFullScreen,
  applyConfig,
  resetToDefaults
} = uiSlice.actions

export default uiSlice.reducer
