import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DestinationState, OutputProfile, Template, TransmissionKit } from '../../../contracts/domain'
import type { ScheduleJob } from '../../../services/runtime-api'
import type { ControlService } from '../../runtime/control-service'
import type { OperationsStore, Role } from '../../runtime/operations'
import { ApiError } from '../../runtime/errors'
import { parseExpectedVersion, setVersionEtag } from './revisions'

type Context = { actor:string; role:Role }
type RevisionResource = 'destination'|'schedule'|'transmission-kit'|'profile'|'template'
type RevisionRecord = { id:string; revision:number; actor:string; createdAt:string; snapshot:Record<string,unknown> }

export interface ConfigurationRevisionRouteDependencies {
  request: IncomingMessage
  response: ServerResponse
  url: URL
  context: Context
  requestId: string
  service: ControlService
  operations: OperationsStore
  sendJson: (response:ServerResponse,status:number,data:unknown,requestId?:string)=>void
  requireRole: (context:Context,role:Role)=>void
  audited: <T>(context:Context,action:string,resource:string,resourceId:string|null,operation:()=>Promise<T>|T)=>Promise<T>
}

const SUPPORTED = new Set<RevisionResource>(['destination','schedule','transmission-kit','profile','template'])

function resourceName(value:string): RevisionResource {
  if (!SUPPORTED.has(value as RevisionResource)) throw new ApiError('REVISION_RESOURCE_UNSUPPORTED', `Revision rollback is not supported for ${value}`, 422)
  return value as RevisionResource
}

function currentVersion(resource:RevisionResource,id:string,service:ControlService,operations:OperationsStore):number {
  if (resource === 'destination') {
    const current = service.listDestinations().find((item) => item.id === id)
    if (!current) throw new ApiError('DESTINATION_NOT_FOUND','Destination not found',404)
    return current.version ?? 1
  }
  if (resource === 'schedule') return operations.getSchedule(id).version ?? 1
  if (resource === 'transmission-kit') return service.getTransmissionKit(id).version ?? 1
  if (resource === 'profile') return service.getProfile(id).version ?? 1
  return service.getTemplate(id).version ?? 1
}

async function restoreSnapshot(resource:RevisionResource,id:string,record:RevisionRecord,service:ControlService,operations:OperationsStore):Promise<Record<string,unknown>> {
  const snapshot = record.snapshot
  if (String(snapshot.id || '') !== id) throw new ApiError('REVISION_SNAPSHOT_INVALID','Revision snapshot does not match the requested resource',409)
  if (resource === 'destination') {
    const keys:Array<keyof DestinationState> = ['provider','label','protocol','endpointUrl','streamKeyRef','videoProfile','audioProfile','monitorMode','hlsPlaybackUrl','providerAckUrl','providerMetadataUrl','providerApiSecretRef','requiresManualPlatformSetup','capabilities','transmissionKitId','notes']
    const patch:Partial<DestinationState> = {}
    for (const key of keys) if (key in snapshot) (patch as Record<string,unknown>)[key] = snapshot[key]
    return service.patchDestination(id,patch) as unknown as Record<string,unknown>
  }
  if (resource === 'schedule') {
    const keys:Array<keyof ScheduleJob> = ['name','action','runAt','recurrenceMinutes','payload','enabled','nextRunAt']
    const patch:Record<string,unknown> = {}
    for (const key of keys) if (key in snapshot) patch[key] = snapshot[key]
    return operations.patchSchedule(id,patch as Parameters<OperationsStore['patchSchedule']>[1]) as unknown as Record<string,unknown>
  }
  if (resource === 'transmission-kit') {
    const keys:Array<keyof TransmissionKit> = ['titleBlock','descriptionBlock','metadata','labels','launchNotes','checklist']
    const patch:Partial<Pick<TransmissionKit,'titleBlock'|'descriptionBlock'|'metadata'|'labels'|'launchNotes'|'checklist'>> = {}
    for (const key of keys) if (key in snapshot) (patch as Record<string,unknown>)[key] = snapshot[key]
    return service.patchTransmissionKit(id,patch) as unknown as Record<string,unknown>
  }
  if (resource === 'profile') {
    const keys:Array<keyof OutputProfile> = ['name','provider','width','height','videoBitrate','audioBitrate','fps','codec']
    const patch:Record<string,unknown> = {}
    for (const key of keys) if (key in snapshot) patch[key] = snapshot[key]
    return service.patchProfile(id,patch as Parameters<ControlService['patchProfile']>[1]) as unknown as Record<string,unknown>
  }
  const keys:Array<keyof Template> = ['name','provider','scene']
  const patch:Partial<Pick<Template,'name'|'provider'|'scene'>> = {}
  for (const key of keys) if (key in snapshot) (patch as Record<string,unknown>)[key] = snapshot[key]
  return service.patchTemplate(id,patch) as unknown as Record<string,unknown>
}

export async function handleConfigurationRevisionRoutes(deps:ConfigurationRevisionRouteDependencies):Promise<boolean> {
  const { request,response,url,context,requestId,service,operations,sendJson,requireRole,audited } = deps
  const listMatch = url.pathname.match(/^\/api\/revisions\/([^/]+)\/([^/]+)$/)
  if (request.method === 'GET' && listMatch) {
    requireRole(context,'admin')
    const resource = resourceName(decodeURIComponent(listMatch[1]))
    const id = decodeURIComponent(listMatch[2])
    sendJson(response,200,{ok:true,data:operations.listRevisions(resource,id)},requestId)
    return true
  }
  const restoreMatch = url.pathname.match(/^\/api\/revisions\/([^/]+)\/([^/]+)\/(\d+)\/restore$/)
  if (request.method !== 'POST' || !restoreMatch) return false
  requireRole(context,'admin')
  const resource = resourceName(decodeURIComponent(restoreMatch[1]))
  const id = decodeURIComponent(restoreMatch[2])
  const revision = Number(restoreMatch[3])
  const expected = parseExpectedVersion(request.headers['if-match'])
  const current = currentVersion(resource,id,service,operations)
  if (expected !== null && expected !== current) throw new ApiError('REVISION_CONFLICT',`${resource} revision does not match`,409)
  const record = operations.getRevision(resource,id,revision) as RevisionRecord|null
  if (!record) throw new ApiError('REVISION_NOT_FOUND','Configuration revision not found',404)
  const data = await audited(context,'restore-revision',resource,id,()=>restoreSnapshot(resource,id,record,service,operations))
  await operations.recordRevision(context.actor,resource,id,data)
  setVersionEtag(response,Number(data.version || current + 1))
  sendJson(response,200,{ok:true,data},requestId)
  return true
}
