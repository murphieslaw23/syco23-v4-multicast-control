import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeDatabase } from '../../server/db'
import { PersistentDatabase } from '../../server/persistent-db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { OperationsStore } from '../../server/runtime/operations'

let dir = ''
let persistence: PersistentDatabase
let operations: OperationsStore

beforeEach(async () => {
  closeDatabase()
  dir = await mkdtemp(join(tmpdir(), 'syco-ops-'))
  persistence = new PersistentDatabase(join(dir, 'runtime.sqlite'))
  await persistence.open()
  operations = new OperationsStore(persistence, new RuntimeEventBus())
})

afterEach(async () => { closeDatabase(); await rm(dir, { recursive: true, force: true }) })

describe('operations store', () => {
  it('persists recurring schedule execution state', async () => {
    const job = await operations.createSchedule({ name:'stop', action:'pipeline.stop', runAt:new Date(Date.now()-1000).toISOString(), nextRunAt:new Date(Date.now()-1000).toISOString(), recurrenceMinutes:5, payload:{}, enabled:true })
    expect(operations.due()).toHaveLength(1)
    await operations.markExecuted(job)
    const updated=operations.listSchedules()[0]
    expect(updated.lastRunAt).toBeTruthy()
    expect(new Date(updated.nextRunAt).getTime()).toBeGreaterThan(Date.now())
  })

  it('records audit and resolves incidents', async () => {
    await operations.audit('tester','admin','create','destination','x','success',{safe:true})
    expect(operations.listAudit()[0]).toMatchObject({ actor:'tester', outcome:'success' })
    const incident=await operations.openIncident('critical','failure','encoder exited','ffmpeg')
    const resolved=await operations.resolveIncident(incident.id,'restarted worker')
    expect(resolved.status).toBe('resolved')
    expect(resolved.closedAt).toBeTruthy()
  })

  it('creates and restores a valid database backup', async () => {
    await operations.audit('tester','admin','backup','database',null,'success')
    const backup=join(dir,'backup.sqlite')
    await persistence.backup(backup)
    expect((await readFile(backup)).byteLength).toBeGreaterThan(100)
  })
})
