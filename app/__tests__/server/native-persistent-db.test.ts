import { afterEach, describe, expect, it } from 'vitest'
import { access, mkdtemp, readFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PersistentDatabase } from '../../server/persistent-db'

let directory = ''
const opened: PersistentDatabase[] = []

afterEach(async () => {
  await Promise.all(opened.splice(0).map(database => database.close()))
  if (directory) await rm(directory, { recursive: true, force: true })
})

describe('native persistent database', () => {
  it('uses WAL and exposes committed writes to a second connection', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-native-db-'))
    const path = join(directory, 'control.sqlite')
    const writer = new PersistentDatabase(path, { driver: 'native' })
    const reader = new PersistentDatabase(path, { driver: 'native' })
    opened.push(writer, reader)

    await writer.open()
    await reader.open()

    expect(writer.database.exec('PRAGMA journal_mode')[0].values[0][0]).toBe('wal')
    await writer.transaction(db => db.run(
      'INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)',
      ['native-1', new Date().toISOString(), 'info', 'test', 'committed'],
    ))

    expect(reader.database.exec('SELECT message FROM log_entries WHERE id = ?', ['native-1'])[0].values[0][0]).toBe('committed')
  })

  it('opens an existing sql.js snapshot with the native driver', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-native-migration-'))
    const path = join(directory, 'control.sqlite')
    const legacy = new PersistentDatabase(path, { driver: 'sqljs' })
    opened.push(legacy)
    await legacy.open()
    await legacy.transaction(db => db.run(
      'INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)',
      ['legacy-1', new Date().toISOString(), 'info', 'migration', 'portable-snapshot'],
    ))
    await legacy.close()
    opened.splice(opened.indexOf(legacy), 1)

    const native = new PersistentDatabase(path, { driver: 'native' })
    opened.push(native)
    await native.open()

    expect(native.database.exec('SELECT message FROM log_entries WHERE id = ?', ['legacy-1'])[0].values[0][0]).toBe('portable-snapshot')
    expect(native.database.exec('PRAGMA journal_mode')[0].values[0][0]).toBe('wal')
  })

  it('backs up and restores a native database without losing WAL state', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-native-backup-'))
    const path = join(directory, 'control.sqlite')
    const backupPath = join(directory, 'backup.sqlite')
    const persistence = new PersistentDatabase(path, { driver: 'native' })
    opened.push(persistence)
    await persistence.open()

    await persistence.transaction(db => db.run(
      'INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)',
      ['native-2', new Date().toISOString(), 'info', 'test', 'before-backup'],
    ))
    await persistence.backup(backupPath)
    const backup = await readFile(backupPath)

    await persistence.transaction(db => db.run('DELETE FROM log_entries WHERE id = ?', ['native-2']))
    expect(persistence.database.exec('SELECT id FROM log_entries WHERE id = ?', ['native-2'])).toHaveLength(0)

    await persistence.restore(backup)
    expect(persistence.database.exec('SELECT message FROM log_entries WHERE id = ?', ['native-2'])[0].values[0][0]).toBe('before-backup')
    expect(persistence.database.exec('PRAGMA journal_mode')[0].values[0][0]).toBe('wal')
  })

  it('rejects an invalid restore without dropping the active database or leaving a restore file', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-native-invalid-restore-'))
    const path = join(directory, 'control.sqlite')
    const persistence = new PersistentDatabase(path, { driver: 'native' })
    opened.push(persistence)
    await persistence.open()
    await persistence.transaction(db => db.run(
      'INSERT INTO log_entries (id,timestamp,level,source,message) VALUES (?,?,?,?,?)',
      ['native-safe', new Date().toISOString(), 'info', 'test', 'still-available'],
    ))

    await expect(persistence.restore(new TextEncoder().encode('not-a-sqlite-database'))).rejects.toThrow()
    expect(persistence.database.exec(
      'SELECT message FROM log_entries WHERE id = ?',
      ['native-safe'],
    )[0].values[0][0]).toBe('still-available')
    await expect(access(`${path}.restore`)).rejects.toMatchObject({ code: 'ENOENT' })
  })
})
