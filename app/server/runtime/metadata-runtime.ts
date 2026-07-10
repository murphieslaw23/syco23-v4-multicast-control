import type { PersistentDatabase } from '../persistent-db'
import type { RuntimeEventBus } from './event-bus'

export interface NormalizedMetadata {
  title: string
  artist: string
  show: string | null
  artworkUrl: string | null
  listeners: number | null
  bitrate: number | null
  codec: string | null
}

export interface MetadataHealth {
  configured: boolean
  running: boolean
  status: 'disabled' | 'fresh' | 'stale' | 'failed' | 'starting'
  lastAttemptAt: string | null
  lastSuccessAt: string | null
  consecutiveFailures: number
  nextPollAt: string | null
  lastError: string | null
}

interface AzuraPayload {
  station?: { name?: string | null }
  name?: string | null
  listeners?: { current?: number | null } | null
  now_playing?: { song?: { title?: string | null; artist?: string | null; art?: string | null } }
  live?: { streamer_name?: string | null }
  station_mounts?: Array<{ bitrate?: number; format?: string }>
}

export interface MetadataRuntimeConfig {
  baseUrl: string
  station: string
  apiKey?: string
  pollIntervalMs: number
  timeoutMs: number
  staleAfterMs: number
  maxBackoffMs: number
}

export class MetadataRuntime {
  private timer: NodeJS.Timeout | null = null
  private latest: NormalizedMetadata = { title:'', artist:'', show:null, artworkUrl:null, listeners:null, bitrate:null, codec:null }
  private health: MetadataHealth

  constructor(private readonly persistence: PersistentDatabase, private readonly events: RuntimeEventBus, private readonly config: MetadataRuntimeConfig) {
    this.health = { configured:Boolean(config.baseUrl && config.station), running:false, status:config.baseUrl && config.station ? 'starting':'disabled', lastAttemptAt:null, lastSuccessAt:null, consecutiveFailures:0, nextPollAt:null, lastError:null }
  }

  async initialize(): Promise<void> {
    const row = this.persistence.database.exec('SELECT captured_at,title,artist,show_name,artwork_url,listeners,bitrate,codec FROM metadata_snapshots ORDER BY captured_at DESC LIMIT 1')[0]?.values[0]
    if (row) {
      this.latest = { title:String(row[1]||''), artist:String(row[2]||''), show:row[3]==null?null:String(row[3]), artworkUrl:row[4]==null?null:String(row[4]), listeners:row[5]==null?null:Number(row[5]), bitrate:row[6]==null?null:Number(row[6]), codec:row[7]==null?null:String(row[7]) }
      this.health.lastSuccessAt = String(row[0])
    }
  }

  start(): void {
    if (!this.health.configured || this.timer) return
    this.health.running = true
    void this.pollAndSchedule(0)
  }

  stop(): void {
    if (this.timer) clearTimeout(this.timer)
    this.timer = null
    this.health.running = false
  }

  snapshot() {
    const age = this.health.lastSuccessAt ? Date.now() - Date.parse(this.health.lastSuccessAt) : Infinity
    const status = !this.health.configured ? 'disabled' : this.health.consecutiveFailures > 0 && age > this.config.staleAfterMs ? 'failed' : age > this.config.staleAfterMs ? 'stale' : this.health.lastSuccessAt ? 'fresh' : 'starting'
    return { metadata: { ...this.latest }, health: { ...this.health, status } as MetadataHealth }
  }

  stats() {
    const rows = this.persistence.database.exec('SELECT COUNT(*),AVG(COALESCE(listeners,0)),MAX(COALESCE(listeners,0)),AVG(COALESCE(bitrate,0)),MIN(captured_at),MAX(captured_at) FROM metadata_snapshots')[0]?.values[0]
    return { samples:Number(rows?.[0]||0), averageListeners:Number(rows?.[1]||0), peakListeners:Number(rows?.[2]||0), averageBitrate:Number(rows?.[3]||0), firstCapturedAt:rows?.[4]==null?null:String(rows[4]), lastCapturedAt:rows?.[5]==null?null:String(rows[5]) }
  }

  async poll(): Promise<NormalizedMetadata> {
    if (!this.health.configured) return this.latest
    this.health.lastAttemptAt = new Date().toISOString()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs)
    try {
      const base = this.config.baseUrl.replace(/\/$/, '')
      const endpoint = `${base}/api/nowplaying/${encodeURIComponent(this.config.station)}`
      const response = await fetch(endpoint, { signal:controller.signal, headers:this.config.apiKey ? { 'X-Api-Key':this.config.apiKey } : undefined })
      if (!response.ok) throw new Error(`AzuraCast returned HTTP ${response.status}`)
      const raw = await response.json() as AzuraPayload
      const mount = raw.station_mounts?.[0]
      const normalized: NormalizedMetadata = {
        title:raw.now_playing?.song?.title?.trim() || '', artist:raw.now_playing?.song?.artist?.trim() || '',
        show:raw.live?.streamer_name?.trim() || raw.station?.name?.trim() || raw.name?.trim() || null,
        artworkUrl:this.safeArtwork(raw.now_playing?.song?.art), listeners:raw.listeners?.current ?? null,
        bitrate:mount?.bitrate ?? null, codec:mount?.format ?? null,
      }
      const capturedAt = new Date().toISOString()
      await this.persistence.transaction(db => db.run('INSERT INTO metadata_snapshots (id,captured_at,title,artist,show_name,artwork_url,listeners,bitrate,codec) VALUES (?,?,?,?,?,?,?,?,?)',[crypto.randomUUID(),capturedAt,normalized.title,normalized.artist,normalized.show,normalized.artworkUrl,normalized.listeners,normalized.bitrate,normalized.codec]))
      this.latest = normalized
      this.health.lastSuccessAt = capturedAt
      this.health.consecutiveFailures = 0
      this.health.lastError = null
      this.events.publish('metadata.updated', normalized)
      return normalized
    } catch (error) {
      this.health.consecutiveFailures++
      this.health.lastError = error instanceof Error ? error.message : String(error)
      this.events.publish('metadata.failed', { error:this.health.lastError, failures:this.health.consecutiveFailures })
      return this.latest
    } finally { clearTimeout(timeout) }
  }

  private async pollAndSchedule(delay: number): Promise<void> {
    if (!this.health.running) return
    if (delay > 0) await new Promise(resolve => { this.timer = setTimeout(resolve, delay) })
    if (!this.health.running) return
    await this.poll()
    const backoff = Math.min(this.config.maxBackoffMs, this.config.pollIntervalMs * 2 ** Math.min(this.health.consecutiveFailures, 6))
    const nextDelay = this.health.consecutiveFailures ? backoff : this.config.pollIntervalMs
    this.health.nextPollAt = new Date(Date.now() + nextDelay).toISOString()
    this.timer = setTimeout(() => void this.pollAndSchedule(0), nextDelay)
    this.timer.unref?.()
  }

  private safeArtwork(value?: string | null): string | null {
    if (!value) return null
    try { const url = new URL(value, this.config.baseUrl); return ['http:','https:'].includes(url.protocol) ? url.toString() : null } catch { return null }
  }
}
