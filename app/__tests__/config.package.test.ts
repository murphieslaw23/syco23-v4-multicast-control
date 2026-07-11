import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function text(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8')
}

function packageJson() {
  return JSON.parse(text('package.json')) as {
    scripts: Record<string, string>
    dependencies: Record<string, string>
    devDependencies: Record<string, string>
  }
}

describe('config.package', () => {
  it('defines deterministic source and browser release gates', () => {
    const scripts = packageJson().scripts
    expect(scripts).toHaveProperty('dev')
    expect(scripts).toHaveProperty('build')
    expect(scripts).toHaveProperty('test')
    expect(scripts).toHaveProperty('lint')
    expect(scripts).toHaveProperty('typecheck')
    expect(scripts).toHaveProperty('e2e')
    expect(scripts.releaseCheck ?? scripts['release:check']).toContain('security:audit')
  })

  it('keeps runtime dependencies separate from development tooling', () => {
    const pkg = packageJson()
    expect(pkg.dependencies).toHaveProperty('vue')
    expect(pkg.dependencies).toHaveProperty('better-sqlite3')
    expect(pkg.dependencies).toHaveProperty('tsx')
    expect(pkg.devDependencies).toHaveProperty('vitest')
    expect(pkg.devDependencies).toHaveProperty('@playwright/test')
    expect(pkg.devDependencies).toHaveProperty('@types/sql.js')
  })

  it('builds a non-root production-only runtime image', () => {
    const dockerfile = text('Dockerfile')
    expect(dockerfile).toContain('npm ci --omit=dev')
    expect(dockerfile).toContain('USER 10001:10001')
    expect(dockerfile).toContain('SYCO_DB_DRIVER=native')
    expect(dockerfile).toContain('ENTRYPOINT ["/usr/bin/tini", "--"]')
  })

  it('runs production E2E, SBOM, image scan and signed release workflows', () => {
    const ci = text('.github/workflows/ci.yml')
    const release = text('.github/workflows/release.yml')
    expect(ci).toContain('npm run release:check')
    expect(ci).toContain('npm sbom --sbom-format cyclonedx')
    expect(ci).toContain('docker/scout-action@v1')
    expect(release).toContain('actions/attest-build-provenance@v2')
    expect(release).toContain('actions/attest-sbom@v2')
  })

  it('targets the integrated production runtime in Playwright', () => {
    const config = text('playwright.config.ts')
    expect(config).toContain('E2E_PORT')
    expect(config).toContain('webServer')
    expect(config).toContain("SYCO_DB_DRIVER: 'native'")
  })

  it('has TypeScript and Vite configuration present', () => {
    expect(text('vite.config.ts')).toContain('vite')
    const tsconfig = JSON.parse(text('tsconfig.json')) as { compilerOptions: Record<string, unknown> }
    expect(tsconfig.compilerOptions).toHaveProperty('target')
  })

  it('keeps server domain imports behind the canonical contracts boundary', () => {
    const matches = spawnSync('rg', [
      '-n',
      String.raw`from ['"](?:\.\./)+types(?:/index)?['"]`,
      'app/server',
    ], { encoding: 'utf8' }).stdout.trim()
    expect(matches).toBe('')
    expect(text('app/contracts/domain.ts')).not.toContain("from '../types")
    expect(text('app/types/index.ts')).toContain("from '../contracts/domain'")
  })

  it('splits the HLS runtime from the main production bundle', () => {
    const config = text('vite.config.ts')
    expect(config).toContain('manualChunks')
    expect(config).toContain("'hls.js'")
  })
})
