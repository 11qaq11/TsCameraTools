import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from './store'
import App from './App'

describe('App', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('应该渲染应用', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <App />
        </HashRouter>
      </Provider>
    )
    // 应用应该渲染成功
    expect(document.body).toBeInTheDocument()
  })
})
