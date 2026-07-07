// Hyper 风格的终端类型定义
// 参考: https://github.com/vercel/hyper/blob/canary/typings/hyper.d.ts

export interface TermProps {
  uid: string
  cols: number | null
  rows: number | null
  scrollback: number
  cursorColor: string
  cursorAccentColor: string
  cursorShape: 'BLOCK' | 'BEAM' | 'UNDERLINE'
  cursorBlink: boolean
  borderColor: string
  selectionColor: string
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontWeightBold: string
  lineHeight: number
  letterSpacing: number
  padding: string
  foregroundColor: string
  backgroundColor: string
  colors: ColorTheme
  webGLRenderer: boolean
  copyOnSelect: boolean
  bell: boolean
  onData: (data: string) => void
  onResize: (cols: number, rows: number) => void
  onTitle: (title: string) => void
}

export interface ColorTheme {
  black: string
  red: string
  green: string
  yellow: string
  blue: string
  magenta: string
  cyan: string
  white: string
  lightBlack: string
  lightRed: string
  lightGreen: string
  lightYellow: string
  lightBlue: string
  lightMagenta: string
  lightCyan: string
  lightWhite: string
}

export interface UiState {
  // 字体配置
  fontSize: number
  fontFamily: string
  fontWeight: string
  fontWeightBold: string
  lineHeight: number
  letterSpacing: number
  
  // 光标配置
  cursorColor: string
  cursorAccentColor: string
  cursorShape: 'BLOCK' | 'BEAM' | 'UNDERLINE'
  cursorBlink: boolean
  
  // 颜色配置
  foregroundColor: string
  backgroundColor: string
  borderColor: string
  selectionColor: string
  colors: ColorTheme
  
  // 终端配置
  scrollback: number
  padding: string
  
  // 渲染器
  webGLRenderer: boolean
  
  // 其他
  copyOnSelect: boolean
  bell: boolean
  
  // 窗口状态
  maximized: boolean
  fullScreen: boolean
}

export interface SessionState {
  uid: string
  title: string
  cols: number
  rows: number
  active: boolean
  shell: string
  pid: number | null
}

export interface SessionsState {
  sessions: Record<string, SessionState>
  activeUid: string | null
}

export interface AppState {
  ui: UiState
  sessions: SessionsState
}
