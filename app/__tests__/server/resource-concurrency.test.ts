import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PersistentDatabase } from '../../server/persistent-db'
import { closeDatabase } from '../../server/db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { ControlService } from '../../server/runtime/control-service'
import { OperationsStore } from '../../server/runtime/operations'
import { resetRuntimeStore } from '../../server/runtime-store'
import type { DestinationState } from '../../contracts/domain'
import { handleDestinationRoutes } from '../../server/http/routes/destinations'
import { handleScheduleRoutes } from '../../server/http/routes/schedules'
import { handleTransmissionKitRoutes } from '../../server/http/routes/transmission-kits'

let directory = ''
let persistence: PersistentDatabase
let service: ControlService
let operations: OperationsStore

const destination: DestinationState = {
  id: 'youtube-main', provider: 'youtube', label: 'YouTube Main', protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'env:YOUTUBE_KEY', status: 'configured',
  health: null, lastHandshakeAt: null, lastError: null, videoProfile: '1080p', audioProfile: '128k',
  monitorMode: 'rtmp-output', requiresManualPlatformSetup: true, capabilities: [], transmissionKitId: null, notes: '',
}

beforeEach(async () => {
  resetRuntimeStore()
  directory = await mkdtemp(join(tmpdir(), 'syco-concurrency-'))
  persistence = new PersistentDatabase(join(directory, 'control.sqlite'))
  const events = new RuntimeEventBus()
  service = new ControlService(persistence, events)
  await service.initialize()
  operations = new OperationsStore(persistence, events)
})

afterEach(async () => {
  await service.workers.stop()
  closeDatabase()
  await rm(directory, { recursive: true, force: true })
})

function responseCapture() {
  const headers = new Map<string,string>()
  return { headers, setHeader(name:string,value:string){ headers.set(name.toLowerCase(),String(value)) } }
}

function dependencies(method:string, pathname:string, bodyValue:unknown, ifMatch?:string) {
  const response = responseCapture()
  let sent: { status:number; payload:unknown } | null = null
  const common = {
    request: { method, headers: ifMatch ? { 'if-match': ifMatch } : {} } as never,
    response: response as never,
    url: new URL(`http://localhost${pathname}`),
    context: { actor: 'admin', role: 'admin' as const }, requestId: 'req-1', service, operations,
    readBody: async () => bodyValue,
    sendJson: (_response:unknown,status:number,payload:unknown) => { sent = { status, payload } },
    requireRole: () => undefined,
    audited: async <T>(_context:unknown,_action:string,_resource:string,_id:string|null,operation:()=>Promise<T>|T) => operation(),
  }
  return { common, response, sent: () => sent }
}

describe('revisioned mutable resources', () => {
  it('persists destination versions and rejects a stale update', async () => {
    const created = await service.createDestination(destination)
    expect(created.version).toBe(1)
    const updated = await service.patchDestination(destination.id, { notes: 'updated' })
    expect(updated.version).toBe(2)
    expect(service.listDestinations()[0]).toMatchObject({ notes: 'updated', version: 2 })

    const deps = dependencies('PATCH', `/api/destinations/${destination.id}`, { notes: 'stale' }, '"1"')
    await expect(handleDestinationRoutes(deps.common)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 })
  })

  it('persists schedule versions and records immutable revisions', async () => {
    const created = await operations.createSchedule({ name:'Start', action:'pipeline.start', runAt:new Date(Date.now()+60_000).toISOString(), nextRunAt:new Date(Date.now()+60_000).toISOString(), recurrenceMinutes:null, payload:{}, enabled:true })
    expect(created.version).toBe(1)
    const updated = await operations.patchSchedule(created.id, { name:'Start updated' })
    expect(updated.version).toBe(2)

    const deps = dependencies('PATCH', `/api/schedules/${created.id}`, { name:'stale' }, '"1"')
    await expect(handleScheduleRoutes(deps.common)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 })
  })

  it('increments kit versions and rejects stale kit edits', async () => {
    await service.createDestination(destination)
    const kit = await service.generateTransmissionKit({ destinationId: destination.id, title: 'Transmission' })
    expect(kit.version).toBe(1)
    const updated = await service.patchTransmissionKit(kit.id, { launchNotes: 'check provider' })
    expect(updated.version).toBe(2)
    expect(service.getTransmissionKit(kit.id)).toMatchObject({ launchNotes:'check provider', version:2 })

    const deps = dependencies('PATCH', `/api/transmission-kits/${kit.id}`, { launchNotes:'stale' }, '"1"')
    await expect(handleTransmissionKitRoutes(deps.common)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 })
  })
})

describe('transmission kit checklist persistence', () => {
  it('persists checklist progress as a revisioned kit update', async () => {
    await service.createDestination(destination)
    const kit = await service.generateTransmissionKit({ destinationId: destination.id, title: 'Checklist test' })
    const first = kit.checklist?.[0]
    expect(first).toBeDefined()
    const checklist = (kit.checklist || []).map((item,index) => index === 0 ? { ...item, completed:true } : item)
    const updated = await service.patchTransmissionKit(kit.id, { checklist })
    expect(updated.version).toBe(2)
    expect(service.getTransmissionKit(kit.id).checklist?.[0]?.completed).toBe(true)
  })
})
