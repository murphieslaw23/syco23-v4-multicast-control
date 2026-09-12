import { spawnSync } from 'node:child_process'
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('IONOS immutable release deploy', () => {
  it('restores the prior release assets after a candidate public-health failure', () => {
    const fixture = mkdtempSync(join(tmpdir(), 'syco23-release-'))
    const appRoot = join(fixture, 'app')
    const releases = join(appRoot, 'releases')
    const previous = join(releases, 'previous')
    const candidate = join(releases, 'candidate')
    const pointers = join(appRoot, 'pointers')
    const shared = join(appRoot, 'shared')
    const bin = join(fixture, 'bin')
    const envFile = join(shared, '.env')
    const commandLog = join(fixture, 'docker.log')
    const previousImage = 'ghcr.io/example/syco23@sha256:' + '1'.repeat(64)
    const candidateImage = 'ghcr.io/example/syco23@sha256:' + '2'.repeat(64)
    const sentinelSecret = 'must-not-appear-in-process-output'

    try {
      for (const directory of [previous, candidate, pointers, shared, bin]) {
        mkdirSync(directory, { recursive: true })
      }
      for (const release of [previous, candidate]) {
        writeFileSync(join(release, 'compose.prod.yml'), 'services: {}\n')
        writeFileSync(join(release, 'Caddyfile'), 'example.invalid {}\n')
        writeFileSync(join(release, 'deploy.sh'), '#!/usr/bin/env bash\n')
      }
      copyFileSync(resolve('deploy/ionos/deploy.sh'), join(candidate, 'deploy.sh'))
      chmodSync(join(candidate, 'deploy.sh'), 0o750)
      writeFileSync(
        envFile,
        [
          'COMPOSE_PROJECT_NAME=syco23_test',
          'DOMAIN=example.invalid',
          'SYCO_IMAGE=' + previousImage,
          'SYCO_BOOTSTRAP_ADMIN_PASSWORD=' + sentinelSecret,
          '',
        ].join('\n'),
        { mode: 0o660 },
      )
      symlinkSync('../releases/previous', join(pointers, 'current'))
      symlinkSync('pointers/current', join(appRoot, 'current'))

      writeFileSync(
        join(bin, 'docker'),
        [
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          'printf \'%s\\n\' "$*" >> "$MOCK_COMMAND_LOG"',
          'if [[ "${1:-}" == "inspect" ]]; then printf \'healthy\\n\'; fi',
          '',
        ].join('\n'),
      )
      writeFileSync(
        join(bin, 'curl'),
        [
          '#!/usr/bin/env bash',
          'set -euo pipefail',
          'if grep -Fq "$MOCK_CANDIDATE_IMAGE" "$MOCK_ENV_FILE"; then',
          '  exit 1',
          'fi',
          'exit 0',
          '',
        ].join('\n'),
      )
      writeFileSync(join(bin, 'sleep'), '#!/usr/bin/env bash\n/usr/bin/sleep 1.1\n')
      chmodSync(join(bin, 'docker'), 0o750)
      chmodSync(join(bin, 'curl'), 0o750)
      chmodSync(join(bin, 'sleep'), 0o750)

      const originalEnvInode = lstatSync(envFile).ino
      const result = spawnSync(join(candidate, 'deploy.sh'), [candidateImage], {
        encoding: 'utf8',
        env: {
          ...process.env,
          PATH: bin + ':' + (process.env.PATH ?? ''),
          HEALTH_TIMEOUT_SECONDS: '1',
          PUBLIC_HEALTH_TIMEOUT_SECONDS: '1',
          MOCK_COMMAND_LOG: commandLog,
          MOCK_ENV_FILE: envFile,
          MOCK_CANDIDATE_IMAGE: candidateImage,
        },
      })

      expect(result.status).toBe(1)
      expect(readlinkSync(join(pointers, 'current'))).toBe('../releases/previous')
      expect(readFileSync(envFile, 'utf8')).toContain('SYCO_IMAGE=' + previousImage)
      expect(lstatSync(envFile).ino).toBe(originalEnvInode)

      const commands = readFileSync(commandLog, 'utf8')
      const candidateUp = '--file ' + candidate + '/compose.prod.yml --env-file ' + envFile + ' up -d --remove-orphans'
      const previousUp = '--file ' + previous + '/compose.prod.yml --env-file ' + envFile + ' up -d --remove-orphans'
      expect(commands).toContain(candidateUp)
      expect(commands).toContain(previousUp)
      expect(commands.indexOf(previousUp)).toBeGreaterThan(commands.indexOf(candidateUp))
      expect(result.stdout + '\n' + result.stderr).not.toContain(sentinelSecret)
    } finally {
      rmSync(fixture, { recursive: true, force: true })
    }
  })
})
