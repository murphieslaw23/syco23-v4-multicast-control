import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { PersistentDatabase } from '../../server/persistent-db'
import { closeDatabase } from '../../server/db'

let directory = ''
afterEach(async () => { closeDatabase(); if (directory) await rm(directory, { recursive: true, force: true }) })

describe('PersistentDatabase', () => {
  it('atomically persists SQLite changes', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-db-'))
    const path = join(directory, 'control.sqlite')
    const persistence = new PersistentDatabase(path)
    await persistence.open()
    await persistence.transaction((db) => db.run('INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)', ['1', new Date().toISOString(), 'info', 'test', 'persisted']))
    const bytes = await readFile(path)
    expect(bytes.byteLength).toBeGreaterThan(100)
    expect(persistence.database.exec('SELECT message FROM log_entries')[0].values[0][0]).toBe('persisted')
  })
})
