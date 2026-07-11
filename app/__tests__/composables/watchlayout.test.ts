import { describe, it, expect, vi } from 'vitest'
import { watchLayout } from '../../composables/layout'

function fakeWindow() {
  const listeners: Array<() => void> = []
  const target = {
    innerWidth: 800,
    innerHeight: 600,
    addEventListener: vi.fn((event: string, handler: () => void) => { if (event === 'resize') listeners.push(handler) }),
    removeEventListener: vi.fn(),
  }
  return { target: target as unknown as Window, mutable: target, listeners }
}

describe('layout.watchLayout', () => {
  it('returns a cleanup function', () => {
    const { target } = fakeWindow()
    expect(typeof watchLayout((state) => state, () => {}, target)).toBe('function')
  })

  it('calls onChange when resize fires', () => {
    const { target, mutable, listeners } = fakeWindow()
    const onChange = vi.fn()
    watchLayout((state) => state, onChange, target)
    mutable.innerWidth = 1920
    mutable.innerHeight = 1080
    listeners.forEach((listener) => listener())
    expect(onChange).toHaveBeenCalledWith({ mode: 'tv' })
  })

  it('cleanup removes the listener', () => {
    const { target, mutable } = fakeWindow()
    const cleanup = watchLayout((state) => state, () => {}, target)
    cleanup()
    expect(mutable.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('returns no-op when target is absent', () => {
    const onChange = vi.fn()
    expect(typeof watchLayout((state) => state, onChange, null)).toBe('function')
    expect(onChange).not.toHaveBeenCalled()
  })
})
