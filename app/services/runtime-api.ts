import type { DestinationState, OutputProfile, Provider, SceneGraph, Template, TransmissionKit } from '../contracts/domain'
import type { PipelineConfig, PipelineStatus } from '../composables/usePipeline'

export interface ApiFailure { code: string; message: string; requestId?: string }
export interface CurrentUser { actor: string; role: 'viewer'|'operator'|'admin' }
export interface RuntimeLog { id:string; timestamp:string; level:string; source:string; message:string }
export interface RuntimeSession { id:string; title:string; startedAt:string; endedAt:string|null; online:boolean }
export interface ScheduleJob { id:string; name:string; action:'pipeline.start'|'pipeline.stop'|'destination.enable'|'destination.disable'; runAt:string; recurrenceMinutes:number|null; payload:Record<string,unknown>; enabled:boolean; lastRunAt:string|null; nextRunAt:string; failureCount:number; lastError:string|null }
export interface Incident { id:string; openedAt:string; closedAt:string|null; severity:'warning'|'critical'; status:'open'|'resolved'; title:string; description:string; source:string; resolution:string|null }
export interface AuditEntry { id:string; timestamp:string; actor:string; role:string; action:string; resource:string; resourceId:string|null; outcome:string; detail:Record<string,unknown> }
export interface BackupRecord { id:string }
export interface ProviderProbeSnapshot { destinationId:string; status:'disabled'|'checking'|'healthy'|'degraded'|'failed'; checkedAt:string|null; latencyMs:number|null; httpStatus:number|null; message:string|null; consecutiveFailures:number }
export interface ProviderMonitorEvent { id:string; destinationId:string; timestamp:string; eventType:string; state:string; message:string|null; detail:Record<string,unknown> }
export interface RetentionResult { [table:string]: number }
export interface SystemMetrics { timestamp:string; uptimeSeconds:number; process:{pid:number;rssBytes:number;heapUsedBytes:number;heapTotalBytes:number}; memory:{totalBytes:number;freeBytes:number;usedPercent:number}; cpu:{cores:number;load1:number;load5:number;load15:number}; disk:{path:string;totalBytes:number;freeBytes:number;usedPercent:number}|null; network:{receivedBytes:number;transmittedBytes:number}|null; eventLoop:{meanMs:number;maxMs:number;p99Ms:number} }
export interface WorkerSnapshot { id?:string; destinationId?:string; state:string; pid:number|null; health?:string; restartCount:number; lastError:string|null; cooldownUntil?:string|null; metrics?:Record<string,number> }
interface Envelope<T> { ok: boolean; data?: T; error?: ApiFailure | string }

let csrfToken = sessionStorage.getItem('syco_csrf') || ''

function apiToken(): string {
  return String((globalThis as typeof globalThis & { SYCO_CONFIG?: { apiToken?: string } }).SYCO_CONFIG?.apiToken || '')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')
  const token = apiToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  if (csrfToken && init.method && !['GET','HEAD'].includes(init.method)) headers.set('x-csrf-token', csrfToken)
  const response = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  const payload = response.status === 204 ? { ok: true } : await response.json() as Envelope<T>
  if (!response.ok || !payload.ok) {
    const failure = typeof payload.error === 'string' ? payload.error : payload.error?.message
    const error = new Error(failure || `Request failed with ${response.status}`) as Error & { code?: string; requestId?: string }
    if (typeof payload.error !== 'string') { error.code = payload.error?.code; error.requestId = payload.error?.requestId }
    throw error
  }
  return payload.data as T
}

export interface RuntimeStatus {
  live: boolean
  pipelineHealth: 'ok' | 'degraded' | 'failed'
  ingestStatus: 'connected' | 'degraded' | 'failed' | 'idle'
  supervisor: {
    state: PipelineStatus['state'] | 'preparing'
    pid: number | null
    startedAt: string | null
    restartCount: number
    lastError: string | null
    metrics: { fps: number; bitrateKbps: number; outTimeMs: number }
  }
  destinations: number
}

export interface PreviewStatus {
  state: 'idle' | 'starting' | 'running' | 'stopping' | 'failed'
  pid: number | null
  startedAt: string | null
  lastSegmentAt: string | null
  playlistReady: boolean
  segmentCount: number
  lastError: string | null
}

export interface ManagedAsset { id: string; filename: string; mimeType: string; size: number; sha256: string; createdAt: string }

export const runtimeApi = {
  login: async (username:string,password:string) => { const data=await request<CurrentUser & {csrfToken:string;expiresAt:string}>('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})}); csrfToken=data.csrfToken; sessionStorage.setItem('syco_csrf',csrfToken); return data },
  logout: async () => { await request<void>('/api/auth/logout',{method:'POST'}); csrfToken=''; sessionStorage.removeItem('syco_csrf') },

  me: () => request<CurrentUser>('/api/me'),
  logs: (limit=500) => request<RuntimeLog[]>(`/api/logs?limit=${limit}`),
  sessions: (limit=500) => request<RuntimeSession[]>(`/api/sessions?limit=${limit}`),
  schedules: () => request<ScheduleJob[]>('/api/schedules'),
  createSchedule: (input: Omit<ScheduleJob,'id'|'lastRunAt'|'failureCount'|'lastError'>) => request<ScheduleJob>('/api/schedules',{method:'POST',body:JSON.stringify(input)}),
  deleteSchedule: (id:string) => request<void>(`/api/schedules/${encodeURIComponent(id)}`,{method:'DELETE'}),
  incidents: () => request<Incident[]>('/api/incidents'),
  resolveIncident: (id:string,resolution:string) => request<Incident>(`/api/incidents/${encodeURIComponent(id)}/resolve`,{method:'POST',body:JSON.stringify({resolution})}),
  audit: (limit=500) => request<AuditEntry[]>(`/api/audit?limit=${limit}`),
  backups: () => request<BackupRecord[]>('/api/backups'),
  createBackup: () => request<BackupRecord>('/api/backups',{method:'POST'}),
  restoreBackup: (id:string) => request<{restored:boolean;id:string}>('/api/backups/restore',{method:'POST',body:JSON.stringify({id})}),
  workers: () => request<WorkerSnapshot[]>('/api/destination-workers'),
  providerMonitor: () => request<ProviderProbeSnapshot[]>('/api/provider-monitor'),
  probeProviders: (destinationId?:string) => request<ProviderProbeSnapshot[]>('/api/provider-monitor/probe',{method:'POST',body:JSON.stringify(destinationId?{destinationId}:{})}),
  providerMonitorEvents: (destinationId:string) => request<ProviderMonitorEvent[]>(`/api/provider-monitor/${encodeURIComponent(destinationId)}/events`),
  systemMetrics: () => request<SystemMetrics>('/api/system/metrics'),
  runRetention: () => request<RetentionResult>('/api/retention/run',{method:'POST'}),
  createDestination: (input: DestinationState) => request<DestinationState>('/api/destinations',{method:'POST',body:JSON.stringify(input)}),
  updateDestination: (id:string,patch:Partial<DestinationState>) => request<DestinationState>(`/api/destinations/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(patch)}),
  deleteDestination: (id:string) => request<void>(`/api/destinations/${encodeURIComponent(id)}`,{method:'DELETE'}),
  status: () => request<RuntimeStatus>('/api/status'),
  destinations: () => request<DestinationState[]>('/api/destinations'),
  profiles: () => request<OutputProfile[]>('/api/profiles'),
  transmissionKits: () => request<{items:TransmissionKit[];total:number}>('/api/transmission-kits'),
  generateTransmissionKit: (input: {destinationId:string;templateId?:string;title?:string;artist?:string;show?:string;publicUrl?:string}) => request<TransmissionKit>('/api/transmission-kits/generate',{method:'POST',body:JSON.stringify(input)}),
  updateTransmissionKit: (id:string,patch:Partial<Pick<TransmissionKit,'titleBlock'|'descriptionBlock'|'metadata'|'labels'|'launchNotes'>>) => request<TransmissionKit>(`/api/transmission-kits/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(patch)}),
  deleteTransmissionKit: (id:string) => request<void>(`/api/transmission-kits/${encodeURIComponent(id)}`,{method:'DELETE'}),
  templates: () => request<Template[]>('/api/templates'),
  createTemplate: (input: { name: string; provider: Provider; scene: SceneGraph; isCustom?: boolean }) => request<Template>('/api/templates', { method: 'POST', body: JSON.stringify(input) }),
  updateTemplate: (id: string, patch: Partial<Pick<Template, 'name' | 'provider' | 'scene'>>, version?:number) => request<Template>(`/api/templates/${encodeURIComponent(id)}`, { method: 'PATCH', headers: version ? { 'if-match': `"${version}"` } : undefined, body: JSON.stringify(patch) }),
  deleteTemplate: (id: string) => request<void>(`/api/templates/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assets: () => request<ManagedAsset[]>('/api/assets'),
  uploadAsset: (input: { filename: string; mimeType: string; base64: string }) => request<ManagedAsset>('/api/assets', { method: 'POST', body: JSON.stringify(input) }),
  deleteAsset: (id: string) => request<void>(`/api/assets/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  previewStatus: () => request<PreviewStatus>('/api/preview/status'),
  previewTicket: () => request<{ ticket: string; expiresAt: string }>('/api/preview/ticket', { method: 'POST' }),
  startPipeline: (config: PipelineConfig) => request<RuntimeStatus['supervisor']>('/api/pipeline/start', {
    method: 'POST',
    headers: { 'idempotency-key': crypto.randomUUID() },
    body: JSON.stringify({ inputUrl: config.sourceUrl, destinationIds: config.destinations.map((item) => item.id), title: 'SYCO23 Transmission', templateId: config.templateId || undefined }),
  }),
  stopPipeline: () => request<RuntimeStatus['supervisor']>('/api/pipeline/stop', { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() } }),
}

export function connectRuntimeEvents(onEvent: (event: { type: string; payload: unknown; timestamp: string }) => void): () => void {
  const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:'
  let closed = false
  let socket: WebSocket | null = null
  let retry = 1000
  let timer: ReturnType<typeof setTimeout> | null = null

  const open = async () => {
    if (closed) return
    try {
      const auth = await request<{ ticket: string }>('/api/events/ticket', { method: 'POST' })
      const url = new URL(`${protocol}//${location.host}/api/events/ws`)
      url.searchParams.set('ticket', auth.ticket)
      socket = new WebSocket(url)
      socket.onopen = () => { retry = 1000 }
      socket.onmessage = (message) => {
        try { onEvent(JSON.parse(String(message.data))) } catch { /* ignore malformed frames */ }
      }
      socket.onclose = () => scheduleReconnect()
    } catch { scheduleReconnect() }
  }
  const scheduleReconnect = () => {
    if (closed) return
    timer = setTimeout(() => void open(), retry)
    retry = Math.min(retry * 2, 30_000)
  }
  void open()
  return () => { closed = true; if (timer) clearTimeout(timer); socket?.close() }
}
