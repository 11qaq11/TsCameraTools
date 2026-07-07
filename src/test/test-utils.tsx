import { render, type RenderOptions } from '@testing-library/react'
import { Provider } from 'react-redux'
import { HashRouter } from 'react-router-dom'
import { store } from '../store'
import type { ReactElement } from 'react'

function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <Provider store={store}>
      <HashRouter>
        {children}
      </HashRouter>
    </Provider>
  )
}

function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllProviders, ...options })
}

export * from '@testing-library/react'
export { renderWithProviders as render }
