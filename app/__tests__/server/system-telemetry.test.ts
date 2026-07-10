import { describe, expect, it } from 'vitest'
import { SystemTelemetry } from '../../server/runtime/system-telemetry'

describe('system telemetry', () => {
  it('reports process, memory, cpu, and event-loop metrics', async () => {
    const telemetry = new SystemTelemetry(process.cwd())
    const snapshot = await telemetry.snapshot()
    telemetry.close()
    expect(snapshot.process.pid).toBe(process.pid)
    expect(snapshot.memory.totalBytes).toBeGreaterThan(0)
    expect(snapshot.cpu.cores).toBeGreaterThan(0)
    expect(snapshot.eventLoop.maxMs).toBeGreaterThanOrEqual(0)
  })
})
