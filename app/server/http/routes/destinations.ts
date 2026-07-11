import type { IncomingMessage, ServerResponse } from 'node:http'
import type { DestinationState } from '../../../contracts/domain'
import type { ControlService } from '../../runtime/control-service'
import type { OperationsStore, Role } from '../../runtime/operations'
import { ApiError } from '../../runtime/errors'
import { parseExpectedVersion, setVersionEtag } from './revisions'

type Context = { actor:string; role:Role }
export interface DestinationRouteDependencies { request:IncomingMessage; response:ServerResponse; url:URL; context:Context; requestId:string; service:ControlService; operations:OperationsStore; readBody:(r:IncomingMessage)=>Promise<unknown>; sendJson:(r:ServerResponse,s:number,d:unknown,id?:string)=>void; requireRole:(c:Context,r:Role)=>void; audited:<T>(c:Context,a:string,res:string,id:string|null,op:()=>Promise<T>|T)=>Promise<T> }

export async function handleDestinationRoutes(d:DestinationRouteDependencies):Promise<boolean>{
 const {request,response,url,context,requestId,service,operations,readBody,sendJson,requireRole,audited}=d
 if(request.method==='GET'&&url.pathname==='/api/destinations'){sendJson(response,200,{ok:true,data:service.listDestinations()},requestId);return true}
 if(request.method==='POST'&&url.pathname==='/api/destinations'){requireRole(context,'admin');const input=await readBody(request) as DestinationState;const data=await audited(context,'create','destination',input.id||null,()=>service.createDestination(input));await operations.recordRevision(context.actor,'destination',data.id,data);setVersionEtag(response,data.version);sendJson(response,201,{ok:true,data},requestId);return true}
 const m=url.pathname.match(/^\/api\/destinations\/([^/]+)$/);if(!m)return false;const id=decodeURIComponent(m[1]);const current=service.listDestinations().find(x=>x.id===id);if(!current)throw new ApiError('DESTINATION_NOT_FOUND','Destination not found',404)
 if(request.method==='GET'){setVersionEtag(response,current.version);sendJson(response,200,{ok:true,data:current},requestId);return true}
 const expected=parseExpectedVersion(request.headers['if-match']);if(expected!==null&&expected!==(current.version??1))throw new ApiError('REVISION_CONFLICT','Destination revision does not match',409)
 if(request.method==='PATCH'){requireRole(context,'admin');const patch=await readBody(request) as Partial<DestinationState>;const data=await audited(context,'update','destination',id,()=>service.patchDestination(id,patch));await operations.recordRevision(context.actor,'destination',id,data);setVersionEtag(response,data.version);sendJson(response,200,{ok:true,data},requestId);return true}
 if(request.method==='DELETE'){requireRole(context,'admin');await audited(context,'delete','destination',id,()=>service.removeDestination(id));sendJson(response,204,null,requestId);return true}
 return false
}
