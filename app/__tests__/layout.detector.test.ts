import { describe, it, expect } from 'vitest'
import { detectLayout } from '../composables/layout'
import type { LayoutState } from '../types/index'

describe('layout.detectLayout', () => {
  it('returns landscape without a browser viewport (SSR)', () => {
    expect(detectLayout(null).mode).toBe('landscape')
  })

  it('returns tv mode for 1920x1080+ viewports', () => {
    expect(detectLayout({ innerWidth: 1920, innerHeight: 1080 }).mode).toBe('tv')
  })

  it('returns tablet mode for landscape width >= 1024', () => {
    expect(detectLayout({ innerWidth: 1024, innerHeight: 768 }).mode).toBe('tablet')
  })

  it('returns landscape mode for landscape width < 1024', () => {
    expect(detectLayout({ innerWidth: 800, innerHeight: 600 }).mode).toBe('landscape')
  })

  it('returns portrait mode for portrait viewports', () => {
    expect(detectLayout({ innerWidth: 400, innerHeight: 800 }).mode).toBe('portrait')
  })

  it('returns a valid LayoutState shape', () => {
    const result: LayoutState = detectLayout(null)
    expect(['portrait', 'landscape', 'tablet', 'tv']).toContain(result.mode)
  })
})
