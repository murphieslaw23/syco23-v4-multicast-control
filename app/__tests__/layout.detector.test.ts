import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { detectLayout } from '../composables/layout'
import type { LayoutState } from '../types/index'

describe('layout.detectLayout', () => {
  const originalWindow = (globalThis as any).window

  beforeEach(() => {
    delete (globalThis as any).window
  })

  afterEach(() => {
    ;(globalThis as any).window = originalWindow
  })

  it('returns landscape when window is undefined (SSR)', () => {
    const result = detectLayout()
    expect(result.mode).toBe('landscape')
  })

  it('returns tv mode for 1920x1080+ viewports', () => {
    ;(globalThis as any).window = {
      innerWidth: 1920,
      innerHeight: 1080,
    }
    const result = detectLayout()
    expect(result.mode).toBe('tv')
  })

  it('returns tablet mode for landscape width >= 1024', () => {
    ;(globalThis as any).window = {
      innerWidth: 1024,
      innerHeight: 768,
    }
    const result = detectLayout()
    expect(result.mode).toBe('tablet')
  })

  it('returns landscape mode for landscape width < 1024', () => {
    ;(globalThis as any).window = {
      innerWidth: 800,
      innerHeight: 600,
    }
    const result = detectLayout()
    expect(result.mode).toBe('landscape')
  })

  it('returns portrait mode for portrait viewports', () => {
    ;(globalThis as any).window = {
      innerWidth: 400,
      innerHeight: 800,
    }
    const result = detectLayout()
    expect(result.mode).toBe('portrait')
  })

  it('returns a valid LayoutState shape', () => {
    const result: LayoutState = detectLayout()
    expect(result).toHaveProperty('mode')
    expect(['portrait', 'landscape', 'tablet', 'tv']).toContain(result.mode)
  })
})
