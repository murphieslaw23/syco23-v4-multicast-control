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
import { handleConfigurationRevisionRoutes } from '../../server/http/routes/configuration-revisions'

let directory = ''
let persistence: PersistentDatabase
let service: ControlService
let operations: OperationsStore

const destination: DestinationState = {
  id: 'youtube-main', provider: 'youtube', label: 'YouTube Main', protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'env:YOUTUBE_KEY', status: 'configured',
  health: null, lastHandshakeAt: null, lastError: null, videoProfile: '1080p', audioProfile: '128k',
  monitorMode: 'rtmp-output', requiresManualPlatformSetup: true, capabilities: [], transmissionKitId: null, notes: 'original',
}

beforeEach(async () => {
  resetRuntimeStore()
  directory = await mkdtemp(join(tmpdir(), 'syco-revisions-'))
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

function route(method:string, pathname:string, ifMatch?:string) {
  let sent: { status:number; payload:unknown } | null = null
  const headers = new Map<string,string>()
  const dependencies = {
    request: { method, headers: ifMatch ? { 'if-match': ifMatch } : {} } as never,
    response: { setHeader(name:string,value:string){ headers.set(name.toLowerCase(),String(value)) } } as never,
    url: new URL(`http://localhost${pathname}`),
    context: { actor:'admin', role:'admin' as const }, requestId:'req-1', service, operations,
    sendJson: (_response:unknown,status:number,payload:unknown) => { sent = { status, payload } },
    requireRole: () => undefined,
    audited: async <T>(_context:unknown,_action:string,_resource:string,_id:string|null,operation:()=>Promise<T>|T) => operation(),
  }
  return { dependencies, sent: () => sent, headers }
}

describe('configuration revision rollback', () => {
  it('restores a prior destination snapshot as a new revision', async () => {
    const created = await service.createDestination(destination)
    await operations.recordRevision('admin', 'destination', created.id, created)
    const changed = await service.patchDestination(created.id, { notes:'changed' })
    await operations.recordRevision('admin', 'destination', changed.id, changed)

    const request = route('POST', '/api/revisions/destination/youtube-main/1/restore', '"2"')
    expect(await handleConfigurationRevisionRoutes(request.dependencies)).toBe(true)

    const restored = service.listDestinations()[0]
    expect(restored).toMatchObject({ id:'youtube-main', notes:'original', version:3 })
    expect(request.headers.get('etag')).toBe('"3"')
    expect(operations.listRevisions('destination', created.id)).toHaveLength(3)
    expect(operations.listRevisions('destination', created.id)[0].snapshot).toMatchObject({ notes:'original', version:3 })
  })

  it('rejects rollback when the current resource revision changed', async () => {
    const created = await service.createDestination(destination)
    await operations.recordRevision('admin', 'destination', created.id, created)
    const changed = await service.patchDestination(created.id, { notes:'changed' })
    await operations.recordRevision('admin', 'destination', changed.id, changed)

    const request = route('POST', '/api/revisions/destination/youtube-main/1/restore', '"1"')
    await expect(handleConfigurationRevisionRoutes(request.dependencies)).rejects.toMatchObject({ code:'REVISION_CONFLICT', status:409 })
  })
})
