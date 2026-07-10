import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('tokens.css', () => {
  const css = readFileSync(resolve(process.cwd(), 'assets/css/variables.css'), 'utf-8')

  it('defines surface colors', () => {
    expect(css).toContain('--syco-surface-0:')
    expect(css).toContain('--syco-surface-1:')
    expect(css).toContain('--syco-surface-2:')
  })

  it('defines signal colors', () => {
    expect(css).toContain('--syco-rust:')
    expect(css).toContain('--syco-crimson:')
    expect(css).toContain('--syco-amber:')
    expect(css).toContain('--syco-copper:')
    expect(css).toContain('--syco-turquoise:')
    expect(css).toContain('--syco-ochre:')
  })

  it('defines spacing on 4px grid', () => {
    expect(css).toContain('--syco-space-1: 4px')
    expect(css).toContain('--syco-space-2: 8px')
  })

  it('defines typography families', () => {
    expect(css).toContain('--syco-font-display:')
    expect(css).toContain('--syco-font-body:')
    expect(css).toContain('--syco-font-mono:')
  })

  it('defines motion timings', () => {
    expect(css).toContain('--syco-duration-fast:')
    expect(css).toContain('--syco-duration-normal:')
  })

  it('defines z-layer indices', () => {
    expect(css).toContain('--syco-z-base:')
    expect(css).toContain('--syco-z-nav:')
    expect(css).toContain('--syco-z-overlay:')
    expect(css).toContain('--syco-z-modal:')
  })

  it('has layout mode overrides', () => {
    expect(css).toContain('data-mode="portrait"')
    expect(css).toContain('data-mode="landscape"')
    expect(css).toContain('data-mode="tablet"')
    expect(css).toContain('data-mode="tv"')
  })
})
