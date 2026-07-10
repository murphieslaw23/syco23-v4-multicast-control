import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { watchLayout } from '../../composables/layout'

describe('layout.watchLayout', () => {
  const originalWindow = (globalThis as any).window
  let listeners: Array<() => void> = []

  beforeEach(() => {
    listeners = []
    ;(globalThis as any).window = {
      innerWidth: 800,
      innerHeight: 600,
      addEventListener: vi.fn((event: string, handler: () => void) => {
        if (event === 'resize') listeners.push(handler)
      }),
      removeEventListener: vi.fn(),
    }
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
  })

  it('returns a cleanup function', () => {
    const cleanup = watchLayout(
      (state) => state,
      () => {},
    )
    expect(typeof cleanup).toBe('function')
  })

  it('calls onChange immediately when resize fires', () => {
    const onChange = vi.fn()
    watchLayout((state) => state, onChange)
    expect(onChange).not.toHaveBeenCalled()
    ;(globalThis as any).window.innerWidth = 1920
    ;(globalThis as any).window.innerHeight = 1080
    listeners.forEach((fn) => fn())
    expect(onChange).toHaveBeenCalledWith({ mode: 'tv' })
  })

  it('cleanup removes the listener', () => {
    const removeSpy = vi.spyOn((globalThis as any).window, 'removeEventListener')
    const cleanup = watchLayout((s) => s, () => {})
    cleanup()
    expect(removeSpy).toHaveBeenCalledWith('resize', expect.any(Function))
    removeSpy.mockRestore()
  })

  it('returns no-op when window is undefined', () => {
    delete (globalThis as any).window
    const onChange = vi.fn()
    const cleanup = watchLayout((s) => s, onChange)
    expect(typeof cleanup).toBe('function')
    expect(onChange).not.toHaveBeenCalled()
  })
})
