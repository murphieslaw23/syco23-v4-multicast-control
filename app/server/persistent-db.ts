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
    const destinationColumns = db.exec('PRAGMA table_info(destinations)')[0]?.values.map(row => String(row[1])) ?? []
    if (!destinationColumns.includes('provider_ack_url')) db.run('ALTER TABLE destinations ADD COLUMN provider_ack_url TEXT')
    if (!destinationColumns.includes('provider_metadata_url')) db.run('ALTER TABLE destinations ADD COLUMN provider_metadata_url TEXT')
    if (!destinationColumns.includes('provider_api_secret_ref')) db.run('ALTER TABLE destinations ADD COLUMN provider_api_secret_ref TEXT')
    if (!destinationColumns.includes('version')) db.run('ALTER TABLE destinations ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
    if (!destinationColumns.includes('created_at')) db.run("ALTER TABLE destinations ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
    if (!destinationColumns.includes('updated_at')) db.run("ALTER TABLE destinations ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    const profileColumns = db.exec('PRAGMA table_info(output_profiles)')[0]?.values.map(row => String(row[1])) ?? []
    if (!profileColumns.includes('version')) db.run('ALTER TABLE output_profiles ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
    if (!profileColumns.includes('created_at')) db.run("ALTER TABLE output_profiles ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
    if (!profileColumns.includes('updated_at')) db.run("ALTER TABLE output_profiles ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    const kitColumns = db.exec('PRAGMA table_info(transmission_kits)')[0]?.values.map(row => String(row[1])) ?? []
    if (!kitColumns.includes('version')) db.run('ALTER TABLE transmission_kits ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
    if (!kitColumns.includes('created_at')) db.run("ALTER TABLE transmission_kits ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
    if (!kitColumns.includes('updated_at')) db.run("ALTER TABLE transmission_kits ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    const currentScheduleColumns = db.exec('PRAGMA table_info(schedules)')[0]?.values.map(row => String(row[1])) ?? []
    if (!currentScheduleColumns.includes('version')) db.run('ALTER TABLE schedules ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
    if (!currentScheduleColumns.includes('created_at')) db.run("ALTER TABLE schedules ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
    if (!currentScheduleColumns.includes('updated_at')) db.run("ALTER TABLE schedules ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    const templateColumns = db.exec('PRAGMA table_info(templates)')[0]?.values.map(row => String(row[1])) ?? []
    if (!templateColumns.includes('scene_json')) db.run("ALTER TABLE templates ADD COLUMN scene_json TEXT NOT NULL DEFAULT '{}'")
    if (!templateColumns.includes('version')) db.run('ALTER TABLE templates ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
    if (!templateColumns.includes('created_at')) db.run("ALTER TABLE templates ADD COLUMN created_at TEXT NOT NULL DEFAULT ''")
    if (!templateColumns.includes('updated_at')) db.run("ALTER TABLE templates ADD COLUMN updated_at TEXT NOT NULL DEFAULT ''")
    const assetColumns = db.exec('PRAGMA table_info(user_assets)')[0]?.values.map(row => String(row[1])) ?? []
    if (!assetColumns.includes('storage_path')) db.run("ALTER TABLE user_assets ADD COLUMN storage_path TEXT NOT NULL DEFAULT ''")
    if (!assetColumns.includes('sha256')) db.run("ALTER TABLE user_assets ADD COLUMN sha256 TEXT NOT NULL DEFAULT ''")
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
