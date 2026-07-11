import BetterSqlite3 from 'better-sqlite3'
import type { QueryExecResult, SqlJsDatabase } from './db'

type NativeDatabase = BetterSqlite3.Database

export class NativeSqliteDatabase implements SqlJsDatabase {
  private readonly native: NativeDatabase
  private rowsModified = 0

  constructor(source: string | Buffer) {
    this.native = new BetterSqlite3(source)
    this.native.pragma('foreign_keys = ON')
    this.native.pragma('busy_timeout = 5000')
  }

  run(sql: string, params: unknown[] = []): SqlJsDatabase {
    if (params.length === 0) {
      this.native.exec(sql)
      this.rowsModified = 0
      return this
    }
    const result = this.native.prepare(sql).run(...params)
    this.rowsModified = result.changes
    return this
  }

  exec(sql: string, params: unknown[] = []): QueryExecResult[] {
    const statement = this.native.prepare<unknown[], Record<string, unknown>>(sql)
    if (!statement.reader) {
      const result = statement.run(...params)
      this.rowsModified = result.changes
      return []
    }
    const columns = statement.columns().map(column => column.name)
    const rows = statement.all(...params)
    if (rows.length === 0) return []
    return [{ columns, values: rows.map(row => columns.map(column => row[column])) }]
  }

  prepare(sql: string, params: unknown[] = []): unknown {
    const statement = this.native.prepare(sql)
    return params.length ? statement.bind(...params) : statement
  }

  export(): Uint8Array {
    return new Uint8Array(this.native.serialize())
  }

  close(): void {
    if (this.native.open) this.native.close()
  }

  getRowsModified(): number {
    return this.rowsModified
  }

  async backupTo(targetPath: string): Promise<void> {
    await this.native.backup(targetPath)
  }

  integrityCheck(): void {
    const result = this.native.pragma('integrity_check', { simple: true })
    if (result !== 'ok') throw new Error(`SQLite integrity check failed: ${String(result)}`)
  }

  configureWal(): void {
    this.native.pragma('journal_mode = WAL')
    this.native.pragma('synchronous = NORMAL')
    this.native.pragma('wal_autocheckpoint = 1000')
  }
}
