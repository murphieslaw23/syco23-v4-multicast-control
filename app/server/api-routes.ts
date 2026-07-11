import type { NowPlaying } from '../composables/useSycoMetadata'
import type { DestinationState, OutputProfile, Template, LogEntry } from '../contracts/domain'
import { getProviderAdapter } from './provider-registry'
import { appendRuntimeLog, createRuntimeId, getRuntimeStore } from './runtime-store'

export interface ApiRequestOptions {
  method?: string
  body?: unknown
  headers?: Record<string, string>
}

export interface StatusSnapshot {
  live: boolean
  pipelineHealth: string
  ingestStatus: string
}

export interface ApiRouteResponses {
  'GET /api/metadata': { ok: true; status: 200; data: NowPlaying; error: null }
  'GET /api/metadata/stats': { ok: true; status: 200; data: { listeners: number; bitrate: number }; error: null }
  'GET /api/status': { ok: true; status: 200; data: StatusSnapshot; error: null }
  'GET /api/destinations': { ok: true; status: 200; data: DestinationState[]; error: null }
  'POST /api/destinations': { ok: true; status: 201; data: DestinationState; error: null }
  'GET /api/destinations/:id/kit': { ok: true; status: 200; data: { kit: string }; error: null }
  'GET /api/streams': { ok: true; status: 200; data: { id: string; title: string; startedAt: string }[]; error: null }
  'POST /api/streams': { ok: true; status: 201; data: { id: string }; error: null }
  'GET /api/templates': { ok: true; status: 200; data: Template[]; error: null }
  'POST /api/templates': { ok: true; status: 201; data: Template; error: null }
  'GET /api/profiles': { ok: true; status: 200; data: OutputProfile[]; error: null }
  'POST /api/profiles': { ok: true; status: 201; data: OutputProfile; error: null }
  'GET /api/logs': { ok: true; status: 200; data: LogEntry[]; error: null }
  'GET /api/watchdog': { ok: true; status: 200; data: { healthy: boolean; events: number }; error: null }
}

export type ApiRoute = keyof ApiRouteResponses

type ErrorResponse = { ok: false; status: number; data: null; error: string }
const ok = <T, S extends number>(status: S, data: T) => ({ ok: true as const, status, data, error: null })
const fail = (status: number, error: string): ErrorResponse => ({ ok: false, status, data: null, error })

export function createApiRouteHandler() {
  return async function handleRequest<T extends ApiRoute>(
    route: T,
    options: ApiRequestOptions = {},
  ): Promise<ApiRouteResponses[T]> {
    const store = getRuntimeStore()

    switch (route) {
      case 'GET /api/metadata':
        return ok(200, store.metadata) as ApiRouteResponses[T]
      case 'GET /api/metadata/stats':
        return ok(200, { listeners: store.metadata.listeners ?? 0, bitrate: store.metadata.bitrate ?? 0 }) as ApiRouteResponses[T]
      case 'GET /api/status':
        return ok(200, { ...store.status }) as ApiRouteResponses[T]
      case 'GET /api/destinations':
        return ok(200, structuredClone(store.destinations)) as ApiRouteResponses[T]
      case 'POST /api/destinations': {
        const destination = options.body as DestinationState | undefined
        if (!destination) return fail(400, 'Destination body is required') as unknown as ApiRouteResponses[T]
        const errors = getProviderAdapter(destination.provider).validate(destination)
        if (errors.length) return fail(422, errors.join('; ')) as unknown as ApiRouteResponses[T]
        const record = { ...destination, id: destination.id || createRuntimeId('dst') }
        store.destinations.push(record)
        appendRuntimeLog('success', 'destinations', `Configured ${record.label}`)
        return ok(201, structuredClone(record)) as ApiRouteResponses[T]
      }
      case 'GET /api/destinations/:id/kit': {
        const destinationId = options.headers?.['x-destination-id']
        const destination = store.destinations.find((item) => item.id === destinationId)
        if (!destination) return fail(404, 'Destination not found') as unknown as ApiRouteResponses[T]
        const adapter = getProviderAdapter(destination.provider)
        const kit = [
          `PROVIDER=${adapter.label}`,
          `ENDPOINT=${destination.endpointUrl}`,
          `STREAM_KEY_REF=${destination.streamKeyRef}`,
          `VIDEO_PROFILE=${destination.videoProfile}`,
          `AUDIO_PROFILE=${destination.audioProfile}`,
        ].join('\n')
        return ok(200, { kit }) as ApiRouteResponses[T]
      }
      case 'GET /api/streams':
        return ok(200, store.streams.map(({ id, title, startedAt }) => ({ id, title, startedAt }))) as ApiRouteResponses[T]
      case 'POST /api/streams': {
        const title = String((options.body as { title?: string } | undefined)?.title ?? 'SYCO23 Transmission')
        const session = { id: createRuntimeId('session'), title, startedAt: new Date().toISOString(), stoppedAt: null }
        store.streams.unshift(session)
        store.status = { live: true, pipelineHealth: 'ok', ingestStatus: 'connected' }
        appendRuntimeLog('success', 'runtime', `Started ${title}`)
        return ok(201, { id: session.id }) as ApiRouteResponses[T]
      }
      case 'GET /api/templates':
        return ok(200, structuredClone(store.templates)) as ApiRouteResponses[T]
      case 'POST /api/templates': {
        const template = options.body as Template | undefined
        if (!template) return fail(400, 'Template body is required') as unknown as ApiRouteResponses[T]
        const record = { ...template, id: template.id || createRuntimeId('tpl') }
        store.templates.push(record)
        return ok(201, structuredClone(record)) as ApiRouteResponses[T]
      }
      case 'GET /api/profiles':
        return ok(200, structuredClone(store.profiles)) as ApiRouteResponses[T]
      case 'POST /api/profiles': {
        const profile = options.body as OutputProfile | undefined
        if (!profile) return fail(400, 'Profile body is required') as unknown as ApiRouteResponses[T]
        const record = { ...profile, id: profile.id || createRuntimeId('profile') }
        store.profiles.push(record)
        return ok(201, structuredClone(record)) as ApiRouteResponses[T]
      }
      case 'GET /api/logs':
        return ok(200, structuredClone(store.logs)) as ApiRouteResponses[T]
      case 'GET /api/watchdog':
        return ok(200, { healthy: store.status.pipelineHealth !== 'failed', events: store.watchdogEvents }) as ApiRouteResponses[T]
      default:
        return fail(404, `Unknown route: ${route}`) as unknown as ApiRouteResponses[T]
    }
  }
}
