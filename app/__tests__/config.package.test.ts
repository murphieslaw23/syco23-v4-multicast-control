import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

function text(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf-8')
}

function sourceFiles(directory: string): string[] {
  return readdirSync(resolve(process.cwd(), directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(ts|vue)$/.test(entry.name) ? [path] : []
  })
}

// Returns "<path>:<line number>: <line>" for every line matching the pattern,
// in the same shape a grep would produce.
function grep(directory: string, pattern: RegExp): string[] {
  return sourceFiles(directory).flatMap((path) =>
    text(path)
      .split('\n')
      .flatMap((line, index) => (pattern.test(line) ? [`${path}:${index + 1}: ${line.trim()}`] : [])),
  )
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

  it('delegates IONOS rollout access through a dedicated non-root group', () => {
    const installer = text('deploy/ionos/install.sh')
    const workflow = text('.github/workflows/deploy-backend-ionos.yml')
    const deploymentGuide = text('docs/DEPLOYMENT.md')

    expect(installer).toContain('DEPLOY_USER="${DEPLOY_USER:?')
    expect(installer).toContain('DEPLOY_GROUP="${DEPLOY_GROUP:-syco23-deploy}"')
    expect(installer).toContain('id -u "$DEPLOY_USER"')
    expect(installer).toContain('groupadd --system "$DEPLOY_GROUP"')
    expect(installer).toContain('usermod -a -G "$DEPLOY_GROUP" "$DEPLOY_USER"')
    expect(installer).toContain('install -d -o root -g "$DEPLOY_GROUP" -m 2770 "$APP_ROOT/releases"')
    expect(installer).toContain('install -d -o root -g "$DEPLOY_GROUP" -m 2770 "$APP_ROOT/pointers"')
    expect(installer).toContain('install -d -o root -g "$DEPLOY_GROUP" -m 0750 "$APP_ROOT/shared"')
    expect(installer).toContain('chown root:"$DEPLOY_GROUP" "$ENV_FILE"')
    expect(installer).toContain('chmod 0660 "$ENV_FILE"')
    expect(installer).toContain('chmod 600 "$CREDENTIALS_FILE"')

    expect(workflow).toContain('IONOS_DEPLOY_GROUP: ${{ vars.IONOS_DEPLOY_GROUP || \'syco23-deploy\' }}')
    expect(workflow).toContain('test "$(id -u)" -ne 0')
    expect(workflow).toContain('id -nG | tr \' \' \'\\n\' | grep -Fx "$IONOS_DEPLOY_GROUP"')
    expect(workflow).toContain('test -w "$IONOS_APP_DIR/releases"')
    expect(workflow).toContain('test -w "$IONOS_APP_DIR/pointers"')
    expect(workflow).toContain('test -w "$IONOS_APP_DIR/shared/.env"')

    expect(deploymentGuide).toContain('DEPLOY_USER=syco23-deploy')
    expect(deploymentGuide).toContain('root:syco23-deploy')
  })

  it('rolls IONOS releases back with the prior compose and Caddy assets', () => {
    const installer = text('deploy/ionos/install.sh')
    const deploy = text('deploy/ionos/deploy.sh')
    const workflow = text('.github/workflows/deploy-backend-ionos.yml')

    expect(installer).toContain('INITIAL_RELEASE="$APP_ROOT/releases/install-$RUN_STAMP"')
    expect(installer).toContain('ln -s "pointers/current" "$APP_ROOT/current"')
    expect(installer).toContain('ln -s "../releases/install-$RUN_STAMP" "$APP_ROOT/pointers/current"')

    expect(workflow).toContain('RELEASE_ID="${GITHUB_SHA}-${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"')
    expect(workflow).toContain('RELEASE_DIR="$IONOS_APP_DIR/releases/$RELEASE_ID"')
    expect(workflow).toContain("printf -v REMOTE_SCRIPT '%q' \"$RELEASE_DIR/deploy.sh\"")
    expect(workflow).toContain("printf -v REMOTE_IMAGE '%q' \"$IMAGE\"")

    expect(deploy).toContain('PREVIOUS_RELEASE="$(readlink -f "$CURRENT_LINK")"')
    expect(deploy).toContain('compose_for "$PREVIOUS_RELEASE" pull')
    expect(deploy).toContain('compose_for "$PREVIOUS_RELEASE" up -d --remove-orphans')
    expect(deploy).toContain('await_public_health')
    expect(deploy).toContain('mv -Tf "$next_pointer" "$ACTIVE_POINTER"')
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
    // Scanned in-process rather than by shelling out to ripgrep, which is not
    // present on every machine that runs this suite.
    const matches = grep('app/server', /from ['"](?:\.\.\/)+types(?:\/index)?['"]/)
    expect(matches).toEqual([])
    expect(text('app/contracts/domain.ts')).not.toContain("from '../types")
    expect(text('app/types/index.ts')).toContain("from '../contracts/domain'")
  })

  it('splits the HLS runtime from the main production bundle', () => {
    const config = text('vite.config.ts')
    expect(config).toContain('manualChunks')
    expect(config).toContain("'hls.js'")
  })
})
