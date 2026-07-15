import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import LocalTerminal from './LocalTerminal'

vi.mock('../components/terminal/XtermTerminal', () => ({
  default: ({ type, onClose }: { type: string; onClose: () => void }) => (
    <div data-testid="xterm-terminal">
      <span>type={type}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}))

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => vi.fn() }
})

describe('LocalTerminal', () => {
  it('渲染 XtermTerminal 组件', () => {
    render(<MemoryRouter><LocalTerminal /></MemoryRouter>)
    expect(screen.getByTestId('xterm-terminal')).toBeInTheDocument()
    expect(screen.getByText('type=local')).toBeInTheDocument()
  })
})
