import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('a11y/contrast', () => {
  const css = readFileSync(resolve(process.cwd(), 'assets/css/variables.css'), 'utf-8')

  it('defines sufficient contrast pairs', () => {
    const hasLightText = css.includes('--syco-text: #ded9e2')
    const hasDarkBg = css.includes('--syco-surface-0: #050506')
    expect(hasLightText).toBe(true)
    expect(hasDarkBg).toBe(true)
  })

  it('has distinct warning and error colors', () => {
    expect(css).toContain('--syco-danger: var(--syco-crimson)')
    expect(css).toContain('--syco-warning: var(--syco-amber)')
    expect(css).toContain('--syco-success: var(--syco-copper)')
  })

  it('has muted color for non-critical info', () => {
    expect(css).toContain('--syco-text-muted: #6b7280')
  })

  it('all signal colors are distinct from each other', () => {
    const colorNames = ['--syco-rust', '--syco-crimson', '--syco-amber', '--syco-copper', '--syco-turquoise', '--syco-ochre']
    const values = colorNames.map((name) => {
      const idx = css.indexOf(name + ':')
      if (idx === -1) return ''
      return css.slice(idx + name.length + 1).trim().split('\n')[0].trim().replace(/;$/, '')
    })
    const unique = new Set(values)
    expect(unique.size).toBe(values.length)
  })
})

describe('a11y/touch-targets', () => {
  const css = readFileSync(resolve(process.cwd(), 'app/app.css'), 'utf-8')

  it('navigation items have minimum 44px touch targets', () => {
    expect(css).toContain('min-height: 44px')
  })

  it('buttons have minimum 44px touch targets', () => {
    expect(css).toContain('min-height: 44px')
  })
})

describe('release readiness', () => {
  it('package.json has all required scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    const scripts = pkg.scripts as Record<string, string>
    expect(scripts['dev']).toBeDefined()
    expect(scripts['build']).toBeDefined()
    expect(scripts['test']).toBeDefined()
    expect(scripts['lint']).toBeDefined()
    expect(scripts['typecheck']).toBeDefined()
    expect(scripts['e2e']).toBeDefined()
    expect(scripts['test:coverage']).toBeDefined()
  })

  it('has vitest coverage thresholds configured', () => {
    const vitestConfig = readFileSync(resolve(process.cwd(), 'vitest.config.ts'), 'utf-8')
    expect(vitestConfig).toContain('thresholds')
    expect(vitestConfig).toContain('100')
  })

  it('has playwright config', () => {
    const pwConfig = readFileSync(resolve(process.cwd(), 'playwright.config.ts'), 'utf-8')
    expect(pwConfig).toContain('testDir')
    expect(pwConfig).toContain('@playwright/test')
  })

  it('has .env.example', () => {
    const envExample = readFileSync(resolve(process.cwd(), '.env.example'), 'utf-8')
    expect(envExample).toContain('AZURACAST_API_URL')
    expect(envExample).toContain('SQLITE_FILE')
  })

  it('README references documentation paths', () => {
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf-8')
    expect(readme).toContain('docs/plans/implementation-plan.md')
    expect(readme).toContain('docs/archival/')
    expect(readme).toContain('RUNBOOK.md')
  })
})
