import type { PersistentDatabase } from '../persistent-db'
import type { RuntimeEventBus } from './event-bus'

export interface RetentionPolicy {
  intervalMs: number
  logsDays: number
  auditDays: number
  incidentsDays: number
  metadataDays: number
  workerEventsDays: number
  providerEventsDays: number
  watchdogEventsDays: number
}

const dayMs = 86_400_000

export class RetentionRuntime {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly persistence: PersistentDatabase,
    private readonly events: RuntimeEventBus,
    private readonly policy: RetentionPolicy,
  ) {}

  start(): void {
    if (this.timer) return
    void this.run()
    this.timer = setInterval(() => void this.run(), this.policy.intervalMs)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
  }

  async run(now = Date.now()): Promise<Record<string, number>> {
    const thresholds = {
      log_entries: new Date(now - this.policy.logsDays * dayMs).toISOString(),
      audit_entries: new Date(now - this.policy.auditDays * dayMs).toISOString(),
      incidents: new Date(now - this.policy.incidentsDays * dayMs).toISOString(),
      metadata_snapshots: new Date(now - this.policy.metadataDays * dayMs).toISOString(),
      destination_worker_events: new Date(now - this.policy.workerEventsDays * dayMs).toISOString(),
      provider_monitor_events: new Date(now - this.policy.providerEventsDays * dayMs).toISOString(),
      watchdog_events: new Date(now - this.policy.watchdogEventsDays * dayMs).toISOString(),
    }
    const removed: Record<string, number> = {}
    await this.persistence.transaction((db) => {
      const plans: Array<[string, string, string]> = [
        ['log_entries', 'timestamp', thresholds.log_entries],
        ['audit_entries', 'timestamp', thresholds.audit_entries],
        ['incidents', 'opened_at', thresholds.incidents],
        ['metadata_snapshots', 'captured_at', thresholds.metadata_snapshots],
        ['destination_worker_events', 'timestamp', thresholds.destination_worker_events],
        ['provider_monitor_events', 'timestamp', thresholds.provider_monitor_events],
        ['watchdog_events', 'timestamp', thresholds.watchdog_events],
      ]
      for (const [table, column, threshold] of plans) {
        const before = Number(db.exec(`SELECT COUNT(*) FROM ${table} WHERE ${column} < ?`, [threshold])[0]?.values[0]?.[0] ?? 0)
        db.run(`DELETE FROM ${table} WHERE ${column} < ?`, [threshold])
        removed[table] = before
      }
    })
    this.events.publish('retention.completed', { removed, timestamp: new Date(now).toISOString() })
    return removed
  }
}
