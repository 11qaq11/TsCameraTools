// Term 组件 - 终端渲染核心
// 参考: https://github.com/vercel/hyper/blob/canary/lib/components/term.tsx

import { useEffect, useRef, forwardRef, useImperativeHandle } from 'react'
import { Terminal } from '@xterm/xterm'
import type { ITerminalOptions, IDisposable } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { SearchAddon } from '@xterm/addon-search'
import { CanvasAddon } from '@xterm/addon-canvas'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { logger } from '../../utils/logger'

interface TermProps {
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
  colors: {
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
  webGLRenderer: boolean
  copyOnSelect: boolean
  bell: boolean
  onData: (data: string) => void
  onResize: (cols: number, rows: number) => void
  onTitle: (title: string) => void
}

// 光标样式映射
const CURSOR_STYLES: Record<string, 'block' | 'underline' | 'bar'> = {
  BLOCK: 'block',
  UNDERLINE: 'underline',
  BEAM: 'bar'
}

// 暴露给父组件的方法接口
export interface TermRef {
  write: (data: string) => void
  search: (query: string) => void
  searchNext: () => void
  searchPrevious: () => void
  clearSearch: () => void
  getSelection: () => string
}

const Term = forwardRef<TermRef, TermProps>(({
  uid,
  scrollback,
  cursorColor,
  cursorAccentColor,
  cursorShape,
  cursorBlink,
  selectionColor,
  fontSize,
  fontFamily,
  fontWeight,
  fontWeightBold,
  lineHeight,
  letterSpacing,
  padding,
  foregroundColor,
  backgroundColor,
  colors,
  copyOnSelect,
  onData,
  onResize,
  onTitle
}, ref) => {
  const termRef = useRef<HTMLDivElement>(null)
  const termInstanceRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const searchAddonRef = useRef<SearchAddon | null>(null)
  const disposableListenersRef = useRef<IDisposable[]>([])
  const composingRef = useRef(false)
  
  // 使用 ref 存储最新的回调函数，避免闭包问题
  const onDataRef = useRef(onData)
  const onResizeRef = useRef(onResize)
  const onTitleRef = useRef(onTitle)

  // 更新 ref
  useEffect(() => {
    onDataRef.current = onData
  }, [onData])
  
  useEffect(() => {
    onResizeRef.current = onResize
  }, [onResize])
  
  useEffect(() => {
    onTitleRef.current = onTitle
  }, [onTitle])

  // 暴露方法给父组件
  useImperativeHandle(ref, () => ({
    write: (data: string) => {
      const term = termInstanceRef.current
      if (term) {
        term.write(data)
      }
    },
    search: (query: string) => {
      const searchAddon = searchAddonRef.current
      if (searchAddon) {
        searchAddon.findNext(query)
      }
    },
    searchNext: () => {
      const searchAddon = searchAddonRef.current
      if (searchAddon) {
        searchAddon.findNext('')
      }
    },
    searchPrevious: () => {
      const searchAddon = searchAddonRef.current
      if (searchAddon) {
        searchAddon.findPrevious('')
      }
    },
    clearSearch: () => {
      const searchAddon = searchAddonRef.current
      if (searchAddon) {
        searchAddon.clearActiveDecoration()
      }
    },
    getSelection: () => {
      const term = termInstanceRef.current
      return term ? term.getSelection() : ''
    }
  }), [])

  // 初始化终端
  useEffect(() => {
    if (!termRef.current) return

    logger.info('Term', `Initializing terminal ${uid}`)

    // 创建终端实例
    const termOptions: ITerminalOptions = {
      fontSize,
      fontFamily,
      fontWeight: fontWeight as any,
      fontWeightBold: fontWeightBold as any,
      lineHeight,
      letterSpacing,
      cursorStyle: CURSOR_STYLES[cursorShape] || 'block',
      cursorBlink,
      scrollback,
      theme: {
        foreground: foregroundColor,
        background: backgroundColor,
        cursor: cursorColor,
        cursorAccent: cursorAccentColor,
        selectionBackground: selectionColor,
        black: colors.black,
        red: colors.red,
        green: colors.green,
        yellow: colors.yellow,
        blue: colors.blue,
        magenta: colors.magenta,
        cyan: colors.cyan,
        white: colors.white,
        brightBlack: colors.lightBlack,
        brightRed: colors.lightRed,
        brightGreen: colors.lightGreen,
        brightYellow: colors.lightYellow,
        brightBlue: colors.lightBlue,
        brightMagenta: colors.lightMagenta,
        brightCyan: colors.lightCyan,
        brightWhite: colors.lightWhite
      },
      allowTransparency: true,
      allowProposedApi: true
    }

    try {
      const term = new Terminal(termOptions)
      termInstanceRef.current = term

      // 加载 addons
      const fitAddon = new FitAddon()
      const searchAddon = new SearchAddon()
      const canvasAddon = new CanvasAddon()
      const webLinksAddon = new WebLinksAddon()

      term.loadAddon(fitAddon)
      term.loadAddon(searchAddon)
      term.loadAddon(canvasAddon)
      term.loadAddon(webLinksAddon)

      fitAddonRef.current = fitAddon
      searchAddonRef.current = searchAddon

      // 打开终端
      term.open(termRef.current)
      term.focus()

      // 初始 fit
      fitAddon.fit()
      logger.info('Term', `Terminal ready: ${term.cols}x${term.rows}`)

      // 发送初始大小
      onResizeRef.current(term.cols, term.rows)

      // 处理窗口大小变化
      let resizeTimeout: ReturnType<typeof setTimeout> | null = null
      const handleWindowResize = () => {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        resizeTimeout = setTimeout(() => {
          const oldCols = term.cols
          const oldRows = term.rows
          fitAddon.fit()
          if (term.cols !== oldCols || term.rows !== oldRows) {
            onResizeRef.current(term.cols, term.rows)
            logger.info('Term', `Window resize: ${oldCols}x${oldRows} → ${term.cols}x${term.rows}`)
          }
        }, 200)
      }
      window.addEventListener('resize', handleWindowResize)

      // IME 处理
      const textarea = term.element?.querySelector('textarea')
      if (textarea) {
        textarea.addEventListener('compositionstart', () => {
          composingRef.current = true
          logger.info('Term', 'IME composition start')
        })
        textarea.addEventListener('compositionend', (e: CompositionEvent) => {
          composingRef.current = false
          if (e.data) {
            logger.info('Term', `IME composition end: ${e.data}`)
            onDataRef.current(e.data)
          }
        })
      }

      // 处理数据输入
      const dataDisposable = term.onData((data) => {
        logger.info('Term', `onData: ${JSON.stringify(data)}`)
        if (composingRef.current) {
          logger.info('Term', 'onData blocked: composing')
          return
        }
        onDataRef.current(data)
      })

      // 处理标题变化
      const titleDisposable = term.onTitleChange((title) => {
        onTitleRef.current(title)
      })

      // 处理选中复制
      if (copyOnSelect) {
        term.onSelectionChange(() => {
          const selection = term.getSelection()
          if (selection) {
            navigator.clipboard.writeText(selection)
          }
        })
      }

      // 存储 disposable listeners
      disposableListenersRef.current = [dataDisposable, titleDisposable]

      // 清理函数
      return () => {
        if (resizeTimeout) clearTimeout(resizeTimeout)
        window.removeEventListener('resize', handleWindowResize)
        disposableListenersRef.current.forEach(d => d.dispose())
        term.dispose()
        logger.info('Term', `Terminal ${uid} disposed`)
      }
    } catch (err) {
      logger.error('Term', `Failed to initialize terminal: ${err}`)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]) // 只在 uid 变化时重新初始化

  // 更新主题
  useEffect(() => {
    const term = termInstanceRef.current
    if (!term) return

    term.options.theme = {
      foreground: foregroundColor,
      background: backgroundColor,
      cursor: cursorColor,
      cursorAccent: cursorAccentColor,
      selectionBackground: selectionColor,
      black: colors.black,
      red: colors.red,
      green: colors.green,
      yellow: colors.yellow,
      blue: colors.blue,
      magenta: colors.magenta,
      cyan: colors.cyan,
      white: colors.white,
      brightBlack: colors.lightBlack,
      brightRed: colors.lightRed,
      brightGreen: colors.lightGreen,
      brightYellow: colors.lightYellow,
      brightBlue: colors.lightBlue,
      brightMagenta: colors.lightMagenta,
      brightCyan: colors.lightCyan,
      brightWhite: colors.lightWhite
    }
  }, [foregroundColor, backgroundColor, cursorColor, cursorAccentColor, selectionColor, colors])

  // 更新字体
  useEffect(() => {
    const term = termInstanceRef.current
    if (!term) return

    term.options.fontSize = fontSize
    term.options.fontFamily = fontFamily
    term.options.fontWeight = fontWeight as any
    term.options.fontWeightBold = fontWeightBold as any
    term.options.lineHeight = lineHeight
    term.options.letterSpacing = letterSpacing

    // 重新 fit
    fitAddonRef.current?.fit()
  }, [fontSize, fontFamily, fontWeight, fontWeightBold, lineHeight, letterSpacing])

  // 更新光标
  useEffect(() => {
    const term = termInstanceRef.current
    if (!term) return

    term.options.cursorStyle = CURSOR_STYLES[cursorShape] || 'block'
    term.options.cursorBlink = cursorBlink
  }, [cursorShape, cursorBlink])

  return (
    <div
      ref={termRef}
      className="flex-1"
      style={{ padding, background: backgroundColor }}
    />
  )
})

Term.displayName = 'Term'

export default Term
