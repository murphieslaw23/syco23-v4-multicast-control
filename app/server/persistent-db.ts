import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { initDatabase, exportDatabase, importDatabase, getDb, isDbReady, type SqlJsDatabase } from './db'

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
    return getDb()
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

  async flush(): Promise<void> {
    this.writeChain = this.writeChain.then(async () => {
      const temp = `${this.filePath}.tmp`
      await writeFile(temp, Buffer.from(exportDatabase()))
      await rename(temp, this.filePath)
    })
    return this.writeChain
  }
}
