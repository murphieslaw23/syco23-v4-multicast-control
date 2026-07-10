import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PersistentDatabase } from '../../server/persistent-db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { OperationsStore } from '../../server/runtime/operations'
import { WatchdogRuntime, type WatchdogTarget } from '../../server/runtime/watchdog-runtime'

const dirs: string[] = []
afterEach(async () => { await Promise.all(dirs.splice(0).map(dir => rm(dir, { recursive: true, force: true }))) })

async function fixture(target: WatchdogTarget, overrides: Partial<ConstructorParameters<typeof WatchdogRuntime>[4]> = {}) {
  const dir = await mkdtemp(join(tmpdir(), 'syco-watchdog-'))
  dirs.push(dir)
  const persistence = new PersistentDatabase(join(dir, 'db.sqlite'))
  await persistence.open()
  const events = new RuntimeEventBus()
  const operations = new OperationsStore(persistence, events)
  const watchdog = new WatchdogRuntime(target, persistence, operations, events, {
    intervalMs: 1000, startupGraceMs: 0, progressTimeoutMs: 10, maxRestarts: 2,
    baseBackoffMs: 0, cooldownMs: 1000, ...overrides,
  })
  return { watchdog, persistence, operations, events }
}

describe('WatchdogRuntime', () => {
  it('recovers a stalled live pipeline and persists the watchdog event', async () => {
    const recoverPipeline = vi.fn(async () => undefined)
    const target: WatchdogTarget = {
      status: () => ({ live: true, supervisor: { state: 'running', startedAt: new Date(0).toISOString(), lastProgressAt: new Date(0).toISOString() } }),
      recoverPipeline,
      markPipelineFailed: vi.fn(async () => undefined),
    }
    const { watchdog, persistence } = await fixture(target)
    await watchdog.tick(100)
    expect(recoverPipeline).toHaveBeenCalledOnce()
    const rows = persistence.database.exec('SELECT severity,message FROM watchdog_events')[0]?.values ?? []
    expect(rows.length).toBeGreaterThanOrEqual(2)
    expect(String(rows[0][1])).toContain('stalled')
  })

  it('enters cooldown and opens an incident after recovery is exhausted', async () => {
    const recoverPipeline = vi.fn(async () => { throw new Error('restart failed') })
    const markPipelineFailed = vi.fn(async () => undefined)
    const target: WatchdogTarget = {
      status: () => ({ live: true, supervisor: { state: 'failed', startedAt: new Date(0).toISOString(), lastProgressAt: new Date(0).toISOString() } }),
      recoverPipeline,
      markPipelineFailed,
    }
    const { watchdog, operations } = await fixture(target, { maxRestarts: 1 })
    await watchdog.tick(100)
    await watchdog.tick(200)
    expect(markPipelineFailed).toHaveBeenCalledOnce()
    expect(operations.listIncidents()[0]).toMatchObject({ severity: 'critical', status: 'open', source: 'watchdog' })
    expect(watchdog.snapshot().cooldownUntil).toBe(1200)
  })

  it('does nothing while a pipeline is healthy', async () => {
    const recoverPipeline = vi.fn(async () => undefined)
    const target: WatchdogTarget = {
      status: () => ({ live: true, supervisor: { state: 'running', startedAt: new Date(95).toISOString(), lastProgressAt: new Date(99).toISOString() } }),
      recoverPipeline,
      markPipelineFailed: vi.fn(async () => undefined),
    }
    const { watchdog } = await fixture(target)
    await watchdog.tick(100)
    expect(recoverPipeline).not.toHaveBeenCalled()
  })
})
