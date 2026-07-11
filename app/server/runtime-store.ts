import type { DestinationState, LogEntry, OutputProfile, Template } from '../contracts/domain'
import type { NowPlaying } from '../composables/useSycoMetadata'
import type { StatusSnapshot } from './api-routes'

export interface StreamSession {
  id: string
  title: string
  startedAt: string
  stoppedAt: string | null
}

export interface RuntimeStore {
  status: StatusSnapshot
  metadata: NowPlaying
  destinations: DestinationState[]
  streams: StreamSession[]
  templates: Template[]
  profiles: OutputProfile[]
  logs: LogEntry[]
  watchdogEvents: number
}

const now = () => new Date().toISOString()
const id = (prefix: string) => `${prefix}_${crypto.randomUUID()}`

const store: RuntimeStore = {
  status: { live: false, pipelineHealth: 'ok', ingestStatus: 'idle' },
  metadata: {
    title: 'NO ACTIVE TRANSMISSION',
    artist: 'SYCO23',
    show: null,
    artworkUrl: '',
    listeners: 0,
    bitrate: 0,
  },
  destinations: [],
  streams: [],
  templates: [],
  profiles: [],
  logs: [],
  watchdogEvents: 0,
}

export function getRuntimeStore(): RuntimeStore {
  return store
}

export function appendRuntimeLog(
  level: LogEntry['level'],
  source: string,
  message: string,
): LogEntry {
  const entry: LogEntry = { id: id('log'), timestamp: now(), level, source, message }
  store.logs.unshift(entry)
  store.logs.splice(500)
  return entry
}

export function resetRuntimeStore(): void {
  store.status = { live: false, pipelineHealth: 'ok', ingestStatus: 'idle' }
  store.destinations = []
  store.streams = []
  store.templates = []
  store.profiles = []
  store.logs = []
  store.watchdogEvents = 0
}

export function createRuntimeId(prefix: string): string {
  return id(prefix)
}
