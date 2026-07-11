import { initDatabase, getDb, isDbReady, closeDatabase, exportDatabase, importDatabase, type SqlJsDatabase } from './db'
import * as destinationsDao from './dao/destinations'
import * as logsDao from './dao/logs'
import * as profilesDao from './dao/profiles'
import * as templatesDao from './dao/templates'
import * as txKitsDao from './dao/transmissionKits'
import * as watchdogDao from './dao/watchdogEvents'
import * as metadataDao from './dao/metadataSnapshots'
import * as streamsDao from './dao/streams'
import * as schedulesDao from './dao/schedules'
import * as assetsDao from './dao/userAssets'
import type { DestinationState, OutputProfile, Template, TransmissionKit, Provider, LogEntry } from '../contracts/domain'
import type { WatchdogEvent } from '../composables/useWatchdog'
import type { NowPlaying } from '../composables/useSycoMetadata'

export interface Database {
  initialize(): Promise<void>
  isReady(): boolean
  close(): void
  exportData(): Uint8Array
  importData(data: Uint8Array): void

  destinations: {
    findAll(): DestinationState[]
    findById(id: string): DestinationState | undefined
    insert(dest: DestinationState): void
    update(id: string, patch: Partial<DestinationState>): void
    delete(id: string): void
  }

  logs: {
    insert(entry: Omit<LogEntry, 'id' | 'timestamp'>): void
    findAll(limit?: number): LogEntry[]
    findByLevel(level: LogEntry['level'], limit?: number): LogEntry[]
    findBySource(source: string, limit?: number): LogEntry[]
    findByTimeRange(from: string, to: string, limit?: number): LogEntry[]
    count(): number
    clear(): void
    prune(keepCount: number): void
  }

  profiles: {
    findAll(): OutputProfile[]
    findById(id: string): OutputProfile | undefined
    insert(profile: OutputProfile): void
    update(id: string, patch: Partial<OutputProfile>): void
    delete(id: string): void
  }

  templates: {
    findAll(): Template[]
    findById(id: string): Template | undefined
    findByProvider(provider: string): Template[]
    insert(template: Template): void
    update(id: string, patch: Partial<Template>): void
    delete(id: string): void
  }

  transmissionKits: {
    findByDestination(destId: string): TransmissionKit[]
    findById(id: string): TransmissionKit | undefined
    insert(kit: TransmissionKit): void
    update(id: string, patch: Partial<TransmissionKit>): void
    delete(id: string): void
    generate(destinationId: string, provider: Provider): TransmissionKit
  }

  watchdog: {
    insert(event: Omit<WatchdogEvent, 'id' | 'timestamp'>): void
    findAll(limit?: number): WatchdogEvent[]
    findBySeverity(severity: string, limit?: number): WatchdogEvent[]
    findByTimeRange(from: string, to: string, limit?: number): WatchdogEvent[]
    getRecent(count: number): WatchdogEvent[]
    clear(): void
  }

  metadata: {
    insert(snapshot: NowPlaying): void
    getLatest(): (NowPlaying & { id: string; capturedAt: string }) | null
    getAll(limit?: number): NowPlaying[]
    clear(): void
  }

  streams: {
    findAll(): streamsDao.StreamRecord[]
    findById(id: string): streamsDao.StreamRecord | undefined
    insert(stream: Omit<streamsDao.StreamRecord, 'id'>): void
    update(id: string, patch: Partial<streamsDao.StreamRecord>): void
    delete(id: string): void
  }

  schedules: {
    findAll(): schedulesDao.ScheduleRecord[]
    findByStream(streamId: string): schedulesDao.ScheduleRecord[]
    findById(id: string): schedulesDao.ScheduleRecord | undefined
    insert(schedule: Omit<schedulesDao.ScheduleRecord, 'id'>): void
    update(id: string, patch: Partial<schedulesDao.ScheduleRecord>): void
    delete(id: string): void
  }

  assets: {
    findAll(): assetsDao.UserAssetRecord[]
    findById(id: string): assetsDao.UserAssetRecord | undefined
    insert(asset: Omit<assetsDao.UserAssetRecord, 'id' | 'createdAt'>): void
    delete(id: string): void
  }
}

class DatabaseImpl implements Database {
  private db: SqlJsDatabase | null = null

  async initialize(): Promise<void> {
    this.db = await initDatabase()
  }

  isReady(): boolean {
    return isDbReady() && this.db !== null
  }

  private getDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized. Call initialize() first.')
    }
    return this.db
  }

  close(): void {
    closeDatabase()
    this.db = null
  }

  exportData(): Uint8Array {
    return exportDatabase()
  }

  importData(data: Uint8Array): void {
    importDatabase(data)
    this.db = getDb()
  }

  destinations = {
    findAll: () => destinationsDao.getAllDestinations(this.getDb()),
    findById: (id: string) => destinationsDao.getDestinationById(this.getDb(), id),
    insert: (dest: DestinationState) => destinationsDao.insertDestination(this.getDb(), dest),
    update: (id: string, patch: Partial<DestinationState>) => destinationsDao.updateDestination(this.getDb(), id, patch),
    delete: (id: string) => destinationsDao.deleteDestination(this.getDb(), id),
  }

  logs = {
    insert: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => logsDao.insertLog(this.getDb(), entry),
    findAll: (limit?: number) => logsDao.getAllLogs(this.getDb(), limit),
    findByLevel: (level: LogEntry['level'], limit?: number) => logsDao.getLogsByLevel(this.getDb(), level, limit),
    findBySource: (source: string, limit?: number) => logsDao.getLogsBySource(this.getDb(), source, limit),
    findByTimeRange: (from: string, to: string, limit?: number) => logsDao.getLogsByTimeRange(this.getDb(), from, to, limit),
    count: () => logsDao.countLogs(this.getDb()),
    clear: () => logsDao.clearLogs(this.getDb()),
    prune: (keepCount: number) => logsDao.pruneOldLogs(this.getDb(), keepCount),
  }

  profiles = {
    findAll: () => profilesDao.getAllProfiles(this.getDb()),
    findById: (id: string) => profilesDao.getProfileById(this.getDb(), id),
    insert: (profile: OutputProfile) => profilesDao.insertProfile(this.getDb(), profile),
    update: (id: string, patch: Partial<OutputProfile>) => profilesDao.updateProfile(this.getDb(), id, patch),
    delete: (id: string) => profilesDao.deleteProfile(this.getDb(), id),
  }

  templates = {
    findAll: () => templatesDao.getAllTemplates(this.getDb()),
    findById: (id: string) => templatesDao.getTemplateById(this.getDb(), id),
    findByProvider: (provider: string) => templatesDao.getTemplatesByProvider(this.getDb(), provider),
    insert: (template: Template) => templatesDao.insertTemplate(this.getDb(), template),
    update: (id: string, patch: Partial<Template>) => templatesDao.updateTemplate(this.getDb(), id, patch),
    delete: (id: string) => templatesDao.deleteTemplate(this.getDb(), id),
  }

  transmissionKits = {
    findByDestination: (destId: string) => txKitsDao.getKitsByDestination(this.getDb(), destId),
    findById: (id: string) => txKitsDao.getKitById(this.getDb(), id),
    insert: (kit: TransmissionKit) => txKitsDao.insertKit(this.getDb(), kit),
    update: (id: string, patch: Partial<TransmissionKit>) => txKitsDao.updateKit(this.getDb(), id, patch),
    delete: (id: string) => txKitsDao.deleteKit(this.getDb(), id),
    generate: (destinationId: string, provider: Provider) => txKitsDao.generateKit({ destinationId, provider }),
  }

  watchdog = {
    insert: (event: Omit<WatchdogEvent, 'id' | 'timestamp'>) => watchdogDao.insertEvent(this.getDb(), event),
    findAll: (limit?: number) => watchdogDao.getAllEvents(this.getDb(), limit),
    findBySeverity: (severity: string, limit?: number) => watchdogDao.getEventsBySeverity(this.getDb(), severity, limit),
    findByTimeRange: (from: string, to: string, limit?: number) => watchdogDao.getEventsByTimeRange(this.getDb(), from, to, limit),
    getRecent: (count: number) => watchdogDao.getRecentEvents(this.getDb(), count),
    clear: () => watchdogDao.clearEvents(this.getDb()),
  }

  metadata = {
    insert: (snapshot: NowPlaying) => metadataDao.insertSnapshot(this.getDb(), snapshot),
    getLatest: () => metadataDao.getLatestSnapshot(this.getDb()),
    getAll: (limit?: number) => metadataDao.getAllSnapshots(this.getDb(), limit),
    clear: () => metadataDao.clearSnapshots(this.getDb()),
  }

  streams = {
    findAll: () => streamsDao.getAllStreams(this.getDb()),
    findById: (id: string) => streamsDao.getStreamById(this.getDb(), id),
    insert: (stream: Omit<streamsDao.StreamRecord, 'id'>) => streamsDao.insertStream(this.getDb(), stream),
    update: (id: string, patch: Partial<streamsDao.StreamRecord>) => streamsDao.updateStream(this.getDb(), id, patch),
    delete: (id: string) => streamsDao.deleteStream(this.getDb(), id),
  }

  schedules = {
    findAll: () => schedulesDao.getAllSchedules(this.getDb()),
    findByStream: (streamId: string) => schedulesDao.getSchedulesByStream(this.getDb(), streamId),
    findById: (id: string) => schedulesDao.getScheduleById(this.getDb(), id),
    insert: (schedule: Omit<schedulesDao.ScheduleRecord, 'id'>) => schedulesDao.insertSchedule(this.getDb(), schedule),
    update: (id: string, patch: Partial<schedulesDao.ScheduleRecord>) => schedulesDao.updateSchedule(this.getDb(), id, patch),
    delete: (id: string) => schedulesDao.deleteSchedule(this.getDb(), id),
  }

  assets = {
    findAll: () => assetsDao.getAllAssets(this.getDb()),
    findById: (id: string) => assetsDao.getAssetById(this.getDb(), id),
    insert: (asset: Omit<assetsDao.UserAssetRecord, 'id' | 'createdAt'>) => assetsDao.insertAsset(this.getDb(), asset),
    delete: (id: string) => assetsDao.deleteAsset(this.getDb(), id),
  }
}

let databaseInstance: DatabaseImpl | null = null

export function getDatabase(): Database {
  if (!databaseInstance) {
    databaseInstance = new DatabaseImpl()
  }
  return databaseInstance
}
