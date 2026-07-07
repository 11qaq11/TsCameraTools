// ErrorBoundary - 捕获 React 错误，防止白屏
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { logger } from '../utils/logger'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('ErrorBoundary', `Caught error: ${error.message}`, {
      stack: error.stack,
      componentStack: errorInfo.componentStack
    })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-8 rounded-xl border border-[#EF4444]/30" style={{ backgroundColor: '#EF444410' }}>
          <div className="text-[#EF4444] text-4xl mb-4">⚠️</div>
          <h2 className="text-lg font-semibold text-[#EF4444] mb-2 font-mono">组件渲染错误</h2>
          <p className="text-sm text-[#EF4444]/80 mb-4 text-center max-w-md font-mono">
            {this.state.error?.message || '发生未知错误'}
          </p>
          <button
            onClick={this.handleReset}
            className="px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#EF4444]/90 transition-colors cursor-pointer font-mono"
          >
            重试
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
