import { createSlice } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'

interface UiState {
  fontSize: number
  fontFamily: string
  maximized: boolean
  fullScreen: boolean
}

const initialState: UiState = {
  fontSize: 14,
  fontFamily: "'JetBrainsMono Nerd Font Mono', 'Cascadia Code', 'DengXian', 'Microsoft YaHei', monospace",
  maximized: false,
  fullScreen: false,
}

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setFontSize: (state, action: PayloadAction<number>) => {
      state.fontSize = action.payload
    },
    setFontFamily: (state, action: PayloadAction<string>) => {
      state.fontFamily = action.payload
    },
    setMaximized: (state, action: PayloadAction<boolean>) => {
      state.maximized = action.payload
    },
    setFullScreen: (state, action: PayloadAction<boolean>) => {
      state.fullScreen = action.payload
    },
    applyConfig: (state, action: PayloadAction<Partial<UiState>>) => {
      return { ...state, ...action.payload }
    },
    resetToDefaults: () => {
      return initialState
    },
  },
})

export const {
  setFontSize,
  setFontFamily,
  setMaximized,
  setFullScreen,
  applyConfig,
  resetToDefaults,
} = uiSlice.actions

export default uiSlice.reducer
