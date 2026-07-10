import type { PersistentDatabase } from '../persistent-db'
import type { RuntimeEventBus } from './event-bus'
import type { OperationsStore } from './operations'

export interface WatchdogTarget {
  status(): { live: boolean; supervisor: { state: string; lastProgressAt: string | null; startedAt: string | null } }
  recoverPipeline(reason: string): Promise<void>
  markPipelineFailed(reason: string): Promise<void>
}

export interface WatchdogConfig {
  intervalMs: number
  startupGraceMs: number
  progressTimeoutMs: number
  maxRestarts: number
  baseBackoffMs: number
  cooldownMs: number
}

const DEFAULTS: WatchdogConfig = {
  intervalMs: 2_000,
  startupGraceMs: 20_000,
  progressTimeoutMs: 15_000,
  maxRestarts: 3,
  baseBackoffMs: 2_000,
  cooldownMs: 60_000,
}

export class WatchdogRuntime {
  private timer: NodeJS.Timeout | null = null
  private checking = false
  private restartCount = 0
  private cooldownUntil = 0

  constructor(
    private readonly target: WatchdogTarget,
    private readonly persistence: PersistentDatabase,
    private readonly operations: OperationsStore,
    private readonly events: RuntimeEventBus,
    private readonly config: WatchdogConfig = DEFAULTS,
  ) {}

  start(): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), this.config.intervalMs)
    this.timer.unref?.()
    this.events.publish('watchdog.started', { config: this.config })
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    this.timer = null
    this.events.publish('watchdog.stopped', {})
  }

  snapshot() {
    return { running: Boolean(this.timer), restartCount: this.restartCount, cooldownUntil: this.cooldownUntil || null }
  }

  async tick(now = Date.now()): Promise<void> {
    if (this.checking) return
    this.checking = true
    try {
      const status = this.target.status()
      if (!status.live) {
        this.restartCount = 0
        this.cooldownUntil = 0
        return
      }
      if (now < this.cooldownUntil) return

      const supervisor = status.supervisor
      const startedAt = supervisor.startedAt ? Date.parse(supervisor.startedAt) : now
      const lastProgressAt = supervisor.lastProgressAt ? Date.parse(supervisor.lastProgressAt) : startedAt
      const inStartupGrace = now - startedAt < this.config.startupGraceMs
      const stalled = !inStartupGrace && now - lastProgressAt > this.config.progressTimeoutMs
      const terminal = supervisor.state === 'failed' || supervisor.state === 'idle'
      if (!stalled && !terminal) return

      const reason = stalled
        ? `FFmpeg progress stalled for ${now - lastProgressAt}ms`
        : `FFmpeg entered unexpected ${supervisor.state} state`
      await this.record('pipeline', 'error', reason)

      if (this.restartCount >= this.config.maxRestarts) {
        this.cooldownUntil = now + this.config.cooldownMs
        await this.target.markPipelineFailed(reason)
        await this.operations.openIncident('critical', 'Pipeline recovery exhausted', `${reason}. Automatic recovery entered cooldown after ${this.restartCount} attempts.`, 'watchdog')
        await this.record('pipeline', 'critical', `Recovery exhausted; cooldown until ${new Date(this.cooldownUntil).toISOString()}`)
        this.events.publish('watchdog.cooldown', { reason, restartCount: this.restartCount, cooldownUntil: this.cooldownUntil })
        return
      }

      const attempt = ++this.restartCount
      const delay = this.config.baseBackoffMs * 2 ** (attempt - 1)
      this.events.publish('watchdog.recovery.scheduled', { reason, attempt, delay })
      await new Promise(resolve => setTimeout(resolve, delay))
      try {
        await this.target.recoverPipeline(reason)
        await this.record('pipeline', 'warning', `Recovery attempt ${attempt} completed`)
        this.events.publish('watchdog.recovery.completed', { reason, attempt })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await this.record('pipeline', 'error', `Recovery attempt ${attempt} failed: ${message}`)
        this.events.publish('watchdog.recovery.failed', { reason, attempt, error: message })
      }
    } finally {
      this.checking = false
    }
  }

  private async record(source: string, severity: string, message: string): Promise<void> {
    const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), source, severity, message }
    await this.persistence.transaction(db => db.run(
      'INSERT INTO watchdog_events (id,timestamp,source,severity,message) VALUES (?,?,?,?,?)',
      [entry.id, entry.timestamp, entry.source, entry.severity, entry.message],
    ))
    this.events.publish('watchdog.event', entry)
  }
}
