import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from '../store'
import Sidebar from './Sidebar'

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该正确渲染导航项', () => {
    render(
      <Provider store={store}>
        <HashRouter>
          <Sidebar />
        </HashRouter>
      </Provider>
    )
    expect(screen.getByText('TsCameraTools')).toBeInTheDocument()
  })
})
