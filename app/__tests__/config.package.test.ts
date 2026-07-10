import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('config.package', () => {
  it('has required scripts', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    expect(pkg.scripts).toHaveProperty('dev')
    expect(pkg.scripts).toHaveProperty('build')
    expect(pkg.scripts).toHaveProperty('test')
    expect(pkg.scripts).toHaveProperty('lint')
    expect(pkg.scripts).toHaveProperty('typecheck')
    expect(pkg.scripts).toHaveProperty('e2e')
  })

  it('has vue as a dependency', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    expect(pkg.dependencies).toHaveProperty('vue')
  })

  it('has vitest and playwright as dev dependencies', () => {
    const pkg = JSON.parse(readFileSync(resolve(process.cwd(), 'package.json'), 'utf-8'))
    expect(pkg.devDependencies).toHaveProperty('vitest')
    expect(pkg.devDependencies).toHaveProperty('@playwright/test')
  })

  it('has vite config present', () => {
    expect(readFileSync(resolve(process.cwd(), 'vite.config.ts'), 'utf-8')).toContain('vite')
  })

  it('has tsconfig present', () => {
    const tsconfig = JSON.parse(readFileSync(resolve(process.cwd(), 'tsconfig.json'), 'utf-8'))
    expect(tsconfig.compilerOptions).toHaveProperty('target')
  })
})
