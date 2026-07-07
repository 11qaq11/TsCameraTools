// Hyper 风格的默认配置
// 参考: https://github.com/vercel/hyper/blob/canary/lib/reducers/ui.ts

import type { UiState, ColorTheme } from '../types/hyper'

export const DEFAULT_COLORS: ColorTheme = {
  black: '#000000',
  red: '#C51E14',
  green: '#1DC121',
  yellow: '#C7C329',
  blue: '#0A2FC4',
  magenta: '#C839C5',
  cyan: '#20C5C6',
  white: '#C7C7C7',
  lightBlack: '#686868',
  lightRed: '#FD6F6B',
  lightGreen: '#67F86F',
  lightYellow: '#FFFA72',
  lightBlue: '#6A76FB',
  lightMagenta: '#FD7CFC',
  lightCyan: '#68FDFE',
  lightWhite: '#FFFFFF'
}

export const DEFAULT_UI_STATE: UiState = {
  // 字体配置
  fontSize: 14,
  fontFamily: "'Cascadia Code', 'JetBrains Mono', 'Fira Code', Menlo, 'DejaVu Sans Mono', 'Lucida Console', monospace",
  fontWeight: 'normal',
  fontWeightBold: 'bold',
  lineHeight: 1,
  letterSpacing: 0,
  
  // 光标配置
  cursorColor: '#F81CE5',
  cursorAccentColor: '#000',
  cursorShape: 'BLOCK',
  cursorBlink: true,
  
  // 颜色配置
  foregroundColor: '#fff',
  backgroundColor: '#000',
  borderColor: '#333',
  selectionColor: 'rgba(248,28,229,0.3)',
  colors: DEFAULT_COLORS,
  
  // 终端配置
  scrollback: 50000,
  padding: '12px 14px',
  
  // 渲染器
  webGLRenderer: false, // 先用 Canvas，后期可切换
  
  // 其他
  copyOnSelect: false,
  bell: false,
  
  // 窗口状态
  maximized: false,
  fullScreen: false
}

// 深色主题（参考 Hyper 默认主题）
export const DARK_THEME: Partial<UiState> = {
  foregroundColor: '#c0caf5',
  backgroundColor: '#1a1b26',
  cursorColor: '#c0caf5',
  cursorAccentColor: '#1a1b26',
  selectionColor: '#33467c',
  borderColor: '#333',
  colors: {
    black: '#15161e',
    red: '#f7768e',
    green: '#9ece6a',
    yellow: '#e0af68',
    blue: '#7aa2f7',
    magenta: '#bb9af7',
    cyan: '#7dcfff',
    white: '#a9b1d6',
    lightBlack: '#414868',
    lightRed: '#f7768e',
    lightGreen: '#9ece6a',
    lightYellow: '#e0af68',
    lightBlue: '#7aa2f7',
    lightMagenta: '#bb9af7',
    lightCyan: '#7dcfff',
    lightWhite: '#c0caf5'
  }
}
