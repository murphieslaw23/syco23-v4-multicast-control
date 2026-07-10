import type { DestinationState, OutputProfile } from '../../types'
import { buildFfmpegFanoutCommand } from '../ffmpeg/command-builder'
import { FfmpegProcessSupervisor } from '../ffmpeg/process-supervisor'
import { getAllDestinations, insertDestination, updateDestination, deleteDestination } from '../dao/destinations'
import { getAllProfiles, insertProfile } from '../dao/profiles'
import { getAllStreams, updateStream } from '../dao/streams'
import { getRuntimeStore, appendRuntimeLog, createRuntimeId } from '../runtime-store'
import { getProviderAdapter } from '../provider-registry'
import type { PersistentDatabase } from '../persistent-db'
import type { RuntimeEventBus } from './event-bus'

export interface StartPipelineRequest {
  inputUrl: string
  destinationIds?: string[]
  streamKeys?: Record<string, string>
  ffmpegPath?: string
  title?: string
}

export class ControlService {
  readonly process: FfmpegProcessSupervisor
  constructor(private readonly persistence: PersistentDatabase, readonly events: RuntimeEventBus) {
    this.process = new FfmpegProcessSupervisor(events)
  }

  async initialize(): Promise<void> {
    await this.persistence.open()
    const store = getRuntimeStore()
    store.destinations = getAllDestinations(this.persistence.database)
    store.profiles = getAllProfiles(this.persistence.database)
    store.streams = getAllStreams(this.persistence.database).map(item => ({ id: item.id, title: item.title, startedAt: item.startedAt, stoppedAt: item.endedAt }))
    const logs = this.persistence.database.exec('SELECT id,timestamp,level,source,message FROM log_entries ORDER BY timestamp DESC LIMIT 500')
    store.logs = logs[0]?.values.map((row) => ({ id: String(row[0]), timestamp: String(row[1]), level: row[2] as never, source: String(row[3]), message: String(row[4]) })) ?? []
    this.log('info', 'runtime', 'Control service initialized')
  }

  listDestinations(): DestinationState[] { return structuredClone(getRuntimeStore().destinations) }
  listProfiles(): OutputProfile[] { return structuredClone(getRuntimeStore().profiles) }

  async createDestination(input: DestinationState): Promise<DestinationState> {
    const destination = { ...input, id: input.id || createRuntimeId('dst') }
    const errors = getProviderAdapter(destination.provider).validate(destination)
    if (errors.length) throw new Error(errors.join('; '))
    if (getRuntimeStore().destinations.some((item) => item.id === destination.id)) throw new Error('Destination id already exists')
    await this.persistence.transaction((db) => insertDestination(db, destination))
    getRuntimeStore().destinations.push(destination)
    this.log('success', 'destinations', `Configured ${destination.label}`)
    this.events.publish('destination.created', destination)
    return structuredClone(destination)
  }

  async patchDestination(id: string, patch: Partial<DestinationState>): Promise<DestinationState> {
    const index = getRuntimeStore().destinations.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('Destination not found')
    const candidate = { ...getRuntimeStore().destinations[index], ...patch, id }
    const errors = getProviderAdapter(candidate.provider).validate(candidate)
    if (errors.length) throw new Error(errors.join('; '))
    await this.persistence.transaction((db) => updateDestination(db, id, patch))
    getRuntimeStore().destinations[index] = candidate
    this.events.publish('destination.updated', candidate)
    return structuredClone(candidate)
  }

  async removeDestination(id: string): Promise<void> {
    const index = getRuntimeStore().destinations.findIndex((item) => item.id === id)
    if (index < 0) throw new Error('Destination not found')
    await this.persistence.transaction((db) => deleteDestination(db, id))
    const [removed] = getRuntimeStore().destinations.splice(index, 1)
    this.log('warning', 'destinations', `Removed ${removed.label}`)
    this.events.publish('destination.deleted', { id })
  }

  async createProfile(profile: OutputProfile): Promise<OutputProfile> {
    const record = { ...profile, id: profile.id || createRuntimeId('profile') }
    if (record.width < 16 || record.height < 16 || record.fps < 1 || record.videoBitrate < 1 || record.audioBitrate < 1) throw new Error('Invalid output profile dimensions or bitrate')
    await this.persistence.transaction((db) => insertProfile(db, record))
    getRuntimeStore().profiles.push(record)
    this.events.publish('profile.created', record)
    return structuredClone(record)
  }

  async startPipeline(request: StartPipelineRequest): Promise<ReturnType<FfmpegProcessSupervisor['snapshot']>> {
    const selected = request.destinationIds?.length
      ? getRuntimeStore().destinations.filter((item) => request.destinationIds?.includes(item.id))
      : getRuntimeStore().destinations
    const command = buildFfmpegFanoutCommand({ inputUrl: request.inputUrl, destinations: selected, profiles: getRuntimeStore().profiles, streamKeys: request.streamKeys, ffmpegPath: request.ffmpegPath })
    this.process.start(command)
    const session = { id: createRuntimeId('session'), title: request.title || 'SYCO23 Transmission', startedAt: new Date().toISOString(), stoppedAt: null }
    await this.persistence.transaction(db => db.run('INSERT INTO streams (id,title,artist,started_at,ended_at,status) VALUES (?,?,?,?,?,?)', [session.id, session.title, '', session.startedAt, null, 'online']))
    getRuntimeStore().streams.unshift(session)
    getRuntimeStore().status = { live: true, pipelineHealth: 'ok', ingestStatus: 'connected' }
    this.log('success', 'pipeline', `Started ${session.title} with ${command.outputCount} output(s)`)
    return this.process.snapshot()
  }

  async stopPipeline(): Promise<ReturnType<FfmpegProcessSupervisor['snapshot']>> {
    await this.process.stop()
    const active = getRuntimeStore().streams.find((item) => item.stoppedAt === null)
    if (active) {
      active.stoppedAt = new Date().toISOString()
      await this.persistence.transaction(db => updateStream(db, active.id, { endedAt: active.stoppedAt, status: 'offline' }))
    }
    getRuntimeStore().status = { live: false, pipelineHealth: 'ok', ingestStatus: 'idle' }
    this.log('info', 'pipeline', 'Pipeline stopped')
    return this.process.snapshot()
  }

  status() {
    return { ...getRuntimeStore().status, supervisor: this.process.snapshot(), destinations: getRuntimeStore().destinations.length }
  }

  sessions(limit = 200) { return structuredClone(getRuntimeStore().streams.slice(0, Math.max(1, Math.min(limit, 1000)))) }

  logs(limit = 200) { return structuredClone(getRuntimeStore().logs.slice(0, Math.max(1, Math.min(limit, 500)))) }

  private log(level: 'info' | 'warning' | 'error' | 'success' | 'debug', source: string, message: string): void {
    const entry = appendRuntimeLog(level, source, message)
    void this.persistence.transaction((db) => db.run('INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)', [entry.id, entry.timestamp, entry.level, entry.source, entry.message]))
    this.events.publish('log.created', entry)
  }
}
