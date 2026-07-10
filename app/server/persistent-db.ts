import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { initDatabase, exportDatabase, importDatabase, getDb, isDbReady, type SqlJsDatabase } from './db'
import { SCHEMA_SQL } from './schema'

export class PersistentDatabase {
  private writeChain: Promise<void> = Promise.resolve()
  constructor(readonly filePath = resolve(process.cwd(), 'data/syco23.sqlite')) {}

  async open(): Promise<SqlJsDatabase> {
    await mkdir(dirname(this.filePath), { recursive: true })
    await initDatabase()
    try {
      const bytes = await readFile(this.filePath)
      if (bytes.byteLength > 0) importDatabase(new Uint8Array(bytes))
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      await this.flush()
    }
    this.migrate(getDb())
    await this.flush()
    return getDb()
  }


  private migrate(db: SqlJsDatabase): void {
    const scheduleColumns = db.exec('PRAGMA table_info(schedules)')[0]?.values.map(row => String(row[1])) ?? []
    if (scheduleColumns.length && !scheduleColumns.includes('action')) {
      db.run('ALTER TABLE schedules RENAME TO schedules_legacy')
    }
    db.run(SCHEMA_SQL)
    if (scheduleColumns.length && !scheduleColumns.includes('action')) {
      db.run(`INSERT INTO schedules (id,name,action,run_at,recurrence_minutes,payload,enabled,last_run_at,next_run_at,failure_count,last_error)
        SELECT id,'Migrated schedule','pipeline.stop',scheduled_start,NULL,'{}',1,NULL,scheduled_start,0,NULL FROM schedules_legacy`)
      db.run('DROP TABLE schedules_legacy')
    }
    db.run('PRAGMA foreign_keys = ON')
  }

  get database(): SqlJsDatabase {
    if (!isDbReady()) throw new Error('Persistent database is not open')
    return getDb()
  }

  async transaction<T>(operation: (db: SqlJsDatabase) => T): Promise<T> {
    const db = this.database
    db.run('BEGIN IMMEDIATE')
    try {
      const result = operation(db)
      db.run('COMMIT')
      await this.flush()
      return result
    } catch (error) {
      db.run('ROLLBACK')
      throw error
    }
  }


  async backup(targetPath: string): Promise<string> {
    await mkdir(dirname(targetPath), { recursive: true })
    await writeFile(targetPath, Buffer.from(exportDatabase()))
    return targetPath
  }

  async restore(bytes: Uint8Array): Promise<void> {
    if (!bytes.byteLength) throw new Error('Backup is empty')
    importDatabase(bytes)
    this.database.run('PRAGMA foreign_keys = ON')
    await this.flush()
  }

  async flush(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      const temp = `${this.filePath}.tmp`
      await writeFile(temp, Buffer.from(exportDatabase()))
      await rename(temp, this.filePath)
    })
    return this.writeChain
  }
}
