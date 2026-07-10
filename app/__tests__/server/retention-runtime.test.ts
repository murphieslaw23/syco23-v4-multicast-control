import { afterEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { closeDatabase } from '../../server/db'
import { PersistentDatabase } from '../../server/persistent-db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { RetentionRuntime } from '../../server/runtime/retention-runtime'

let directory = ''
afterEach(async () => { closeDatabase(); if (directory) await rm(directory, { recursive: true, force: true }) })

async function database() {
  directory = await mkdtemp(join(tmpdir(), 'syco-retention-'))
  const db = new PersistentDatabase(join(directory, 'control.sqlite'))
  await db.open()
  return db
}

describe('RetentionRuntime', () => {
  it('removes expired operational records and retains recent rows', async () => {
    const persistence = await database()
    const old = new Date('2025-01-01T00:00:00.000Z').toISOString()
    const recent = new Date('2026-07-10T00:00:00.000Z').toISOString()
    await persistence.transaction((db) => {
      db.run('INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)', ['old', old, 'info', 'test', 'old'])
      db.run('INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)', ['new', recent, 'info', 'test', 'new'])
    })
    const runtime = new RetentionRuntime(persistence, new RuntimeEventBus(), {
      intervalMs: 1000, logsDays: 30, auditDays: 365, incidentsDays: 180,
      metadataDays: 30, workerEventsDays: 30, providerEventsDays: 30, watchdogEventsDays: 90,
    })
    const result = await runtime.run(new Date('2026-07-10T12:00:00.000Z').getTime())
    expect(result.log_entries).toBe(1)
    const rows = persistence.database.exec('SELECT id FROM log_entries')
    expect(rows[0].values).toEqual([['new']])
  })
})
