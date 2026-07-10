import type { DestinationState, OutputProfile } from '../types'
import type { PipelineConfig, PipelineStatus } from '../composables/usePipeline'

interface ApiFailure { code: string; message: string; requestId?: string }
interface Envelope<T> { ok: boolean; data?: T; error?: ApiFailure | string }

function apiToken(): string {
  return String((globalThis as typeof globalThis & { SYCO_CONFIG?: { apiToken?: string } }).SYCO_CONFIG?.apiToken || '')
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set('accept', 'application/json')
  if (init.body) headers.set('content-type', 'application/json')
  const token = apiToken()
  if (token) headers.set('authorization', `Bearer ${token}`)
  const response = await fetch(path, { ...init, headers })
  const payload = response.status === 204 ? { ok: true } : await response.json() as Envelope<T>
  if (!response.ok || !payload.ok) {
    const failure = typeof payload.error === 'string' ? payload.error : payload.error?.message
    throw new Error(failure || `Request failed with ${response.status}`)
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

export const runtimeApi = {
  status: () => request<RuntimeStatus>('/api/status'),
  destinations: () => request<DestinationState[]>('/api/destinations'),
  profiles: () => request<OutputProfile[]>('/api/profiles'),
  previewStatus: () => request<PreviewStatus>('/api/preview/status'),
  previewTicket: () => request<{ ticket: string; expiresAt: string }>('/api/preview/ticket', { method: 'POST' }),
  startPipeline: (config: PipelineConfig) => request<RuntimeStatus['supervisor']>('/api/pipeline/start', {
    method: 'POST',
    body: JSON.stringify({ inputUrl: config.sourceUrl, destinationIds: config.destinations.map((item) => item.id), title: 'SYCO23 Transmission' }),
  }),
  stopPipeline: () => request<RuntimeStatus['supervisor']>('/api/pipeline/stop', { method: 'POST' }),
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
