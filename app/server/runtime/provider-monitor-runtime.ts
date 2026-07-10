import type { DestinationState } from '../../types'
import type { PersistentDatabase } from '../persistent-db'
import { getProviderAdapter } from '../provider-registry'
import type { RuntimeEventBus } from './event-bus'
import type { SecretStore } from './secret-store'

export interface ProviderProbeSnapshot {
  destinationId: string
  status: 'disabled' | 'checking' | 'healthy' | 'degraded' | 'failed'
  checkedAt: string | null
  latencyMs: number | null
  httpStatus: number | null
  message: string | null
  consecutiveFailures: number
}

export class ProviderMonitorRuntime {
  private timer: NodeJS.Timeout | null = null
  private readonly snapshots = new Map<string, ProviderProbeSnapshot>()
  private metadataTimer: NodeJS.Timeout | null = null
  private pendingMetadata: Record<string, unknown> | null = null

  constructor(
    private readonly persistence: PersistentDatabase,
    private readonly events: RuntimeEventBus,
    private readonly secrets: SecretStore,
    private readonly destinations: () => DestinationState[],
    private readonly intervalMs = Number(process.env.SYCO_PROVIDER_PROBE_INTERVAL_MS || 15000),
    private readonly timeoutMs = Number(process.env.SYCO_PROVIDER_PROBE_TIMEOUT_MS || 5000),
  ) {}

  start(): void {
    if (this.timer) return
    void this.tick()
    this.timer = setInterval(() => void this.tick(), this.intervalMs)
    this.timer.unref?.()
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer)
    if (this.metadataTimer) clearTimeout(this.metadataTimer)
    this.timer = null
    this.metadataTimer = null
  }

  list(): ProviderProbeSnapshot[] {
    return this.destinations().map((destination) => this.snapshots.get(destination.id) || {
      destinationId: destination.id,
      status: destination.monitorMode === 'rtmp-output' ? 'disabled' : 'checking',
      checkedAt: null,
      latencyMs: null,
      httpStatus: null,
      message: null,
      consecutiveFailures: 0,
    })
  }

  async probeNow(destinationId?: string): Promise<ProviderProbeSnapshot[]> {
    const selected = this.destinations().filter((item) => !destinationId || item.id === destinationId)
    for (const destination of selected) await this.probe(destination)
    return this.list().filter((item) => !destinationId || item.destinationId === destinationId)
  }

  scheduleMetadataPublish(metadata: Record<string, unknown>): void {
    this.pendingMetadata = metadata
    if (this.metadataTimer) clearTimeout(this.metadataTimer)
    this.metadataTimer = setTimeout(() => void this.flushMetadata(), 750)
    this.metadataTimer.unref?.()
  }

  private async tick(): Promise<void> {
    for (const destination of this.destinations()) {
      if (destination.status === 'disabled' || destination.monitorMode === 'rtmp-output') continue
      await this.probe(destination)
    }
  }

  private async probe(destination: DestinationState): Promise<void> {
    const previous = this.snapshots.get(destination.id)
    const adapter = getProviderAdapter(destination.provider)
    const started = Date.now()
    try {
      const result = await adapter.probe(destination, this.secrets, this.timeoutMs)
      const snapshot: ProviderProbeSnapshot = {
        destinationId: destination.id,
        status: result.live ? 'healthy' : 'degraded',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        httpStatus: result.httpStatus,
        message: result.message,
        consecutiveFailures: result.live ? 0 : (previous?.consecutiveFailures || 0) + 1,
      }
      this.snapshots.set(destination.id, snapshot)
      await this.persist(destination.id, 'probe', snapshot.status, snapshot.message, snapshot)
      this.events.publish('provider.probe.updated', snapshot)
    } catch (error) {
      const message = adapter.normalizeError(error)
      const snapshot: ProviderProbeSnapshot = {
        destinationId: destination.id,
        status: 'failed',
        checkedAt: new Date().toISOString(),
        latencyMs: Date.now() - started,
        httpStatus: null,
        message,
        consecutiveFailures: (previous?.consecutiveFailures || 0) + 1,
      }
      this.snapshots.set(destination.id, snapshot)
      await this.persist(destination.id, 'probe.failed', 'failed', message, snapshot)
      this.events.publish('provider.probe.failed', snapshot)
    }
  }

  private async flushMetadata(): Promise<void> {
    const metadata = this.pendingMetadata
    this.pendingMetadata = null
    if (!metadata) return
    for (const destination of this.destinations()) {
      if (!destination.providerMetadataUrl) continue
      const adapter = getProviderAdapter(destination.provider)
      try {
        const result = await adapter.publishMetadata(destination, metadata, this.secrets, this.timeoutMs)
        await this.persist(destination.id, 'metadata.published', 'healthy', result.message, result)
        this.events.publish('provider.metadata.published', { destinationId: destination.id, ...result })
      } catch (error) {
        const message = adapter.normalizeError(error)
        await this.persist(destination.id, 'metadata.failed', 'failed', message, {})
        this.events.publish('provider.metadata.failed', { destinationId: destination.id, message })
      }
    }
  }

  private async persist(destinationId: string, eventType: string, state: string, message: string | null, detail: unknown): Promise<void> {
    await this.persistence.transaction((db) => db.run(
      'INSERT INTO provider_monitor_events (id,destination_id,timestamp,event_type,state,message,detail) VALUES (?,?,?,?,?,?,?)',
      [crypto.randomUUID(), destinationId, new Date().toISOString(), eventType, state, message, JSON.stringify(detail)],
    ))
  }
}
