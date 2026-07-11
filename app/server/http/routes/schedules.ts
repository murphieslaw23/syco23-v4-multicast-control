import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OperationsStore, Role, ScheduleJob } from '../../runtime/operations'
import { ApiError } from '../../runtime/errors'
import { parseExpectedVersion, setVersionEtag } from './revisions'

type Context={actor:string;role:Role}
export interface ScheduleRouteDependencies{request:IncomingMessage;response:ServerResponse;url:URL;context:Context;requestId:string;operations:OperationsStore;readBody:(r:IncomingMessage)=>Promise<unknown>;sendJson:(r:ServerResponse,s:number,d:unknown,id?:string)=>void;requireRole:(c:Context,r:Role)=>void;audited:<T>(c:Context,a:string,res:string,id:string|null,op:()=>Promise<T>|T)=>Promise<T>}
export async function handleScheduleRoutes(d:ScheduleRouteDependencies):Promise<boolean>{const{request,response,url,context,requestId,operations,readBody,sendJson,requireRole,audited}=d
 if(request.method==='GET'&&url.pathname==='/api/schedules'){sendJson(response,200,{ok:true,data:operations.listSchedules()},requestId);return true}
 if(request.method==='POST'&&url.pathname==='/api/schedules'){requireRole(context,'operator');const input=await readBody(request) as Omit<ScheduleJob,'id'|'lastRunAt'|'failureCount'|'lastError'>;const data=await audited(context,'create','schedule',null,()=>operations.createSchedule(input));await operations.recordRevision(context.actor,'schedule',data.id,data);setVersionEtag(response,data.version);sendJson(response,201,{ok:true,data},requestId);return true}
 const m=url.pathname.match(/^\/api\/schedules\/([^/]+)$/);if(!m)return false;const id=decodeURIComponent(m[1]);let current:ScheduleJob;try{current=operations.getSchedule(id)}catch{throw new ApiError('SCHEDULE_NOT_FOUND','Schedule not found',404)}
 if(request.method==='GET'){setVersionEtag(response,current.version);sendJson(response,200,{ok:true,data:current},requestId);return true}
 const expected=parseExpectedVersion(request.headers['if-match']);if(expected!==null&&expected!==(current.version??1))throw new ApiError('REVISION_CONFLICT','Schedule revision does not match',409)
 if(request.method==='PATCH'){requireRole(context,'operator');const patch=await readBody(request) as Partial<ScheduleJob>;const data=await audited(context,'update','schedule',id,()=>operations.patchSchedule(id,patch));await operations.recordRevision(context.actor,'schedule',id,data);setVersionEtag(response,data.version);sendJson(response,200,{ok:true,data},requestId);return true}
 if(request.method==='DELETE'){requireRole(context,'operator');await audited(context,'delete','schedule',id,()=>operations.deleteSchedule(id));sendJson(response,204,null,requestId);return true}return false}
