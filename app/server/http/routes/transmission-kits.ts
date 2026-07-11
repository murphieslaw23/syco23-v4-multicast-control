import type { IncomingMessage, ServerResponse } from 'node:http'
import type { TransmissionKit } from '../../../contracts/domain'
import type { GenerateTransmissionKitRequest } from '../../../contracts/api'
import type { ControlService } from '../../runtime/control-service'
import type { OperationsStore, Role } from '../../runtime/operations'
import { ApiError } from '../../runtime/errors'
import { parseExpectedVersion, setVersionEtag } from './revisions'

type Context={actor:string;role:Role}
export interface TransmissionKitRouteDependencies{request:IncomingMessage;response:ServerResponse;url:URL;context:Context;requestId:string;service:ControlService;operations:OperationsStore;readBody:(r:IncomingMessage)=>Promise<unknown>;sendJson:(r:ServerResponse,s:number,d:unknown,id?:string)=>void;requireRole:(c:Context,r:Role)=>void;audited:<T>(c:Context,a:string,res:string,id:string|null,op:()=>Promise<T>|T)=>Promise<T>}
export async function handleTransmissionKitRoutes(d:TransmissionKitRouteDependencies):Promise<boolean>{const{request,response,url,context,requestId,service,operations,readBody,sendJson,requireRole,audited}=d
 if(request.method==='GET'&&url.pathname==='/api/transmission-kits'){requireRole(context,'viewer');const items=service.listTransmissionKits();sendJson(response,200,{ok:true,data:{items,total:items.length}},requestId);return true}
 if(request.method==='POST'&&url.pathname==='/api/transmission-kits/generate'){requireRole(context,'operator');const input=await readBody(request) as GenerateTransmissionKitRequest;if(!String(input.destinationId||'').trim())throw new ApiError('DESTINATION_REQUIRED','Destination is required',422);const data=await audited(context,'generate','transmission-kit',null,()=>service.generateTransmissionKit(input));await operations.recordRevision(context.actor,'transmission-kit',data.id,data);setVersionEtag(response,data.version);sendJson(response,201,{ok:true,data},requestId);return true}
 const m=url.pathname.match(/^\/api\/transmission-kits\/([^/]+)$/);if(!m)return false;const id=decodeURIComponent(m[1]);const current=service.getTransmissionKit(id)
 if(request.method==='GET'){requireRole(context,'viewer');setVersionEtag(response,current.version);sendJson(response,200,{ok:true,data:current},requestId);return true}
 const expected=parseExpectedVersion(request.headers['if-match']);if(expected!==null&&expected!==(current.version??1))throw new ApiError('REVISION_CONFLICT','Transmission kit revision does not match',409)
 if(request.method==='PATCH'){requireRole(context,'operator');const patch=await readBody(request) as Partial<Pick<TransmissionKit,'titleBlock'|'descriptionBlock'|'metadata'|'labels'|'launchNotes'|'checklist'>>;const data=await audited(context,'update','transmission-kit',id,()=>service.patchTransmissionKit(id,patch));await operations.recordRevision(context.actor,'transmission-kit',id,data);setVersionEtag(response,data.version);sendJson(response,200,{ok:true,data},requestId);return true}
 if(request.method==='DELETE'){requireRole(context,'operator');await audited(context,'delete','transmission-kit',id,()=>service.removeTransmissionKit(id));sendJson(response,204,null,requestId);return true}return false}
