import type { SqlJsDatabase } from '../db'
import type { PersistentDatabase } from '../persistent-db'
import type { RuntimeEventBus } from './event-bus'

export type Role = 'viewer' | 'operator' | 'admin'
export type ScheduleAction = 'pipeline.start' | 'pipeline.stop' | 'destination.enable' | 'destination.disable'

export interface ScheduleJob {
  id: string
  name: string
  action: ScheduleAction
  runAt: string
  recurrenceMinutes: number | null
  payload: Record<string, unknown>
  enabled: boolean
  lastRunAt: string | null
  nextRunAt: string
  failureCount: number
  lastError: string | null
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface Incident {
  id: string
  openedAt: string
  closedAt: string | null
  severity: 'warning' | 'critical'
  status: 'open' | 'resolved'
  title: string
  description: string
  source: string
  resolution: string | null
}

function rows(db: SqlJsDatabase, sql: string, params: unknown[] = []): unknown[][] {
  return db.exec(sql, params)[0]?.values ?? []
}

function mapSchedule(row: unknown[]): ScheduleJob {
  return {
    id: String(row[0]), name: String(row[1]), action: row[2] as ScheduleAction,
    runAt: String(row[3]), recurrenceMinutes: row[4] == null ? null : Number(row[4]),
    payload: JSON.parse(String(row[5] || '{}')) as Record<string, unknown>, enabled: Number(row[6]) === 1,
    lastRunAt: row[7] == null ? null : String(row[7]), nextRunAt: String(row[8]),
    failureCount: Number(row[9]), lastError: row[10] == null ? null : String(row[10]),
    version: Number(row[11] ?? 1), createdAt: String(row[12] ?? ''), updatedAt: String(row[13] ?? ''),
  }
}

export class OperationsStore {
  constructor(private readonly persistence: PersistentDatabase, private readonly events: RuntimeEventBus) {}

  listSchedules(): ScheduleJob[] {
    return rows(this.persistence.database, 'SELECT id,name,action,run_at,recurrence_minutes,payload,enabled,last_run_at,next_run_at,failure_count,last_error,version,created_at,updated_at FROM schedules ORDER BY next_run_at').map(mapSchedule)
  }

  async createSchedule(input: Omit<ScheduleJob, 'id'|'lastRunAt'|'failureCount'|'lastError'>): Promise<ScheduleJob> {
    if (!input.name.trim()) throw new Error('Schedule name is required')
    if (!['pipeline.start','pipeline.stop','destination.enable','destination.disable'].includes(input.action)) throw new Error('Unsupported schedule action')
    const runAt = new Date(input.runAt)
    if (!Number.isFinite(runAt.getTime())) throw new Error('Invalid schedule date')
    if (input.recurrenceMinutes !== null && input.recurrenceMinutes < 1) throw new Error('Recurrence must be at least one minute')
    const now = new Date().toISOString()
    const job: ScheduleJob = { ...input, id: crypto.randomUUID(), lastRunAt: null, failureCount: 0, lastError: null, nextRunAt: runAt.toISOString(), version: 1, createdAt: now, updatedAt: now }
    await this.persistence.transaction(db => db.run('INSERT INTO schedules (id,name,action,run_at,recurrence_minutes,payload,enabled,last_run_at,next_run_at,failure_count,last_error,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)', [job.id,job.name,job.action,job.runAt,job.recurrenceMinutes,JSON.stringify(job.payload),job.enabled?1:0,null,job.nextRunAt,0,null,1,now,now]))
    this.events.publish('schedule.created', job)
    return job
  }


  getSchedule(id: string): ScheduleJob {
    const job = this.listSchedules().find(item => item.id === id)
    if (!job) throw new Error('Schedule not found')
    return job
  }

  async patchSchedule(id: string, patch: Partial<Omit<ScheduleJob, 'id'|'version'|'createdAt'|'updatedAt'|'lastRunAt'|'failureCount'|'lastError'>>): Promise<ScheduleJob> {
    const current = this.getSchedule(id)
    const candidate: ScheduleJob = { ...current, ...patch, id, version: (current.version ?? 1) + 1, createdAt: current.createdAt, updatedAt: new Date().toISOString() }
    if (!candidate.name.trim()) throw new Error('Schedule name is required')
    if (!['pipeline.start','pipeline.stop','destination.enable','destination.disable'].includes(candidate.action)) throw new Error('Unsupported schedule action')
    if (!Number.isFinite(new Date(candidate.runAt).getTime())) throw new Error('Invalid schedule date')
    if (candidate.recurrenceMinutes !== null && candidate.recurrenceMinutes < 1) throw new Error('Recurrence must be at least one minute')
    await this.persistence.transaction(db => db.run('UPDATE schedules SET name=?,action=?,run_at=?,recurrence_minutes=?,payload=?,enabled=?,next_run_at=?,version=?,updated_at=? WHERE id=?',[candidate.name,candidate.action,candidate.runAt,candidate.recurrenceMinutes,JSON.stringify(candidate.payload),candidate.enabled?1:0,candidate.nextRunAt,candidate.version,candidate.updatedAt,id]))
    this.events.publish('schedule.updated', candidate)
    return candidate
  }

  async deleteSchedule(id: string): Promise<void> {
    await this.persistence.transaction(db => { db.run('DELETE FROM schedules WHERE id=?',[id]); if (!db.getRowsModified()) throw new Error('Schedule not found') })
    this.events.publish('schedule.deleted', { id })
  }

  due(now = new Date()): ScheduleJob[] {
    return this.listSchedules().filter(job => job.enabled && new Date(job.nextRunAt).getTime() <= now.getTime())
  }

  async markExecuted(job: ScheduleJob, error?: unknown): Promise<void> {
    const lastRunAt = new Date().toISOString()
    if (error) {
      await this.persistence.transaction(db => db.run('UPDATE schedules SET last_run_at=?,failure_count=failure_count+1,last_error=? WHERE id=?',[lastRunAt,error instanceof Error?error.message:String(error),job.id]))
      return
    }
    if (job.recurrenceMinutes) {
      const next = new Date(Math.max(Date.now(), new Date(job.nextRunAt).getTime()) + job.recurrenceMinutes * 60000).toISOString()
      await this.persistence.transaction(db => db.run('UPDATE schedules SET last_run_at=?,next_run_at=?,failure_count=0,last_error=NULL WHERE id=?',[lastRunAt,next,job.id]))
    } else {
      await this.persistence.transaction(db => db.run('UPDATE schedules SET last_run_at=?,enabled=0,failure_count=0,last_error=NULL WHERE id=?',[lastRunAt,job.id]))
    }
  }

  async recordRevision(actor:string,resource:string,resourceId:string,snapshot:unknown):Promise<number>{const r=rows(this.persistence.database,'SELECT COALESCE(MAX(revision),0) FROM configuration_revisions WHERE resource=? AND resource_id=?',[resource,resourceId])[0];const revision=Number(r?.[0]??0)+1;await this.persistence.transaction(db=>db.run('INSERT INTO configuration_revisions (id,resource,resource_id,revision,actor,created_at,snapshot) VALUES (?,?,?,?,?,?,?)',[crypto.randomUUID(),resource,resourceId,revision,actor,new Date().toISOString(),JSON.stringify(snapshot)]));this.events.publish('configuration.revision',{resource,resourceId,revision,actor});return revision}
  listRevisions(resource:string,resourceId:string,limit=100){return rows(this.persistence.database,'SELECT id,revision,actor,created_at,snapshot FROM configuration_revisions WHERE resource=? AND resource_id=? ORDER BY revision DESC LIMIT ?',[resource,resourceId,Math.max(1,Math.min(limit,500))]).map(r=>({id:String(r[0]),revision:Number(r[1]),actor:String(r[2]),createdAt:String(r[3]),snapshot:JSON.parse(String(r[4]||'{}'))}))}
  getRevision(resource:string,resourceId:string,revision:number){const r=rows(this.persistence.database,'SELECT id,revision,actor,created_at,snapshot FROM configuration_revisions WHERE resource=? AND resource_id=? AND revision=?',[resource,resourceId,revision])[0];return r?{id:String(r[0]),revision:Number(r[1]),actor:String(r[2]),createdAt:String(r[3]),snapshot:JSON.parse(String(r[4]||'{}'))}:null}

  async audit(actor: string, role: Role, action: string, resource: string, resourceId: string|null, outcome: 'success'|'failure', detail: unknown = {}): Promise<void> {
    const entry = { id: crypto.randomUUID(), timestamp: new Date().toISOString(), actor, role, action, resource, resourceId, outcome, detail }
    await this.persistence.transaction(db => db.run('INSERT INTO audit_entries (id,timestamp,actor,role,action,resource,resource_id,outcome,detail) VALUES (?,?,?,?,?,?,?,?,?)',[entry.id,entry.timestamp,actor,role,action,resource,resourceId,outcome,JSON.stringify(detail)]))
    this.events.publish('audit.created', entry)
  }

  listAudit(limit=200) {
    return rows(this.persistence.database,'SELECT id,timestamp,actor,role,action,resource,resource_id,outcome,detail FROM audit_entries ORDER BY timestamp DESC LIMIT ?',[Math.max(1,Math.min(limit,1000))]).map(r=>({id:String(r[0]),timestamp:String(r[1]),actor:String(r[2]),role:r[3] as Role,action:String(r[4]),resource:String(r[5]),resourceId:r[6]==null?null:String(r[6]),outcome:String(r[7]),detail:JSON.parse(String(r[8]||'{}'))}))
  }

  async openIncident(severity: Incident['severity'], title: string, description: string, source: string): Promise<Incident> {
    const incident: Incident = { id: crypto.randomUUID(), openedAt:new Date().toISOString(),closedAt:null,severity,status:'open',title,description,source,resolution:null }
    await this.persistence.transaction(db=>db.run('INSERT INTO incidents (id,opened_at,closed_at,severity,status,title,description,source,resolution) VALUES (?,?,?,?,?,?,?,?,?)',[incident.id,incident.openedAt,null,severity,'open',title,description,source,null]))
    this.events.publish('incident.opened', incident)
    return incident
  }

  listIncidents(): Incident[] {
    return rows(this.persistence.database,'SELECT id,opened_at,closed_at,severity,status,title,description,source,resolution FROM incidents ORDER BY opened_at DESC').map(r=>({id:String(r[0]),openedAt:String(r[1]),closedAt:r[2]==null?null:String(r[2]),severity:r[3] as Incident['severity'],status:r[4] as Incident['status'],title:String(r[5]),description:String(r[6]),source:String(r[7]),resolution:r[8]==null?null:String(r[8])}))
  }

  async resolveIncident(id:string,resolution:string):Promise<Incident>{
    if(!resolution.trim()) throw new Error('Resolution is required')
    const closedAt=new Date().toISOString()
    await this.persistence.transaction(db=>{db.run('UPDATE incidents SET status=?,closed_at=?,resolution=? WHERE id=? AND status=?',['resolved',closedAt,resolution,id,'open']);if(!db.getRowsModified())throw new Error('Open incident not found')})
    const incident=this.listIncidents().find(item=>item.id===id)
    if(!incident) throw new Error('Incident not found')
    this.events.publish('incident.resolved',incident)
    return incident
  }
}
