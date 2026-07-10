import initSqlJs from 'sql.js'
import { SCHEMA_SQL, validateSchema } from './schema'

interface SqlJsDatabase {
  run(sql: string, params?: unknown[]): SqlJsDatabase
  exec(sql: string, params?: unknown[]): QueryExecResult[]
  prepare(sql: string, params?: unknown[]): unknown
  export(): Uint8Array
  close(): void
  getRowsModified(): number
}

interface QueryExecResult {
  columns: string[]
  values: unknown[][]
}

interface SqlJsStatic {
  Database: new (data?: ArrayLike<number> | null) => SqlJsDatabase
}

let db: SqlJsDatabase | null = null
let sqlJsStatic: SqlJsStatic | null = null
let initialized = false
let initError: string | null = null

export { type SqlJsDatabase, type QueryExecResult }

export interface DbInitOptions {
  wasmPath?: string
}

import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const WASM_PATH = resolve(__dirname, '../../node_modules/sql.js/dist/sql-wasm.wasm')

export async function initDatabase(options: DbInitOptions = {}): Promise<SqlJsDatabase> {
  if (db && initialized) {
    return db
  }

  try {
    const SQL = await initSqlJs({
      locateFile: (_url: string, _scriptDirectory: string) => options.wasmPath || WASM_PATH,
    }) as SqlJsStatic

    sqlJsStatic = SQL

    db = new SQL.Database()

    db.run(SCHEMA_SQL)

    const result = validateSchema(SCHEMA_SQL)
    if (!result.valid) {
      throw new Error(`Schema validation failed. Missing tables: ${result.missing.join(', ')}`)
    }

    db.run('PRAGMA foreign_keys = ON')
    db.run('PRAGMA journal_mode = WAL')

    initialized = true
    initError = null

    return db
  } catch (err) {
    initError = err instanceof Error ? err.message : 'Unknown database error'
    initialized = false
    db = null
    throw err
  }
}

export function getDb(): SqlJsDatabase {
  if (!db || !initialized) {
    throw new Error('Database not initialized. Call initDatabase() first.')
  }
  return db
}

export function isDbReady(): boolean {
  return initialized && db !== null
}

export function getDbError(): string | null {
  return initError
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
    initialized = false
    initError = null
  }
}

export function exportDatabase(): Uint8Array {
  const database = getDb()
  return database.export()
}

export function importDatabase(data: Uint8Array): void {
  if (!sqlJsStatic) {
    throw new Error('sql.js not loaded. Call initDatabase() first.')
  }
  closeDatabase()
  db = new sqlJsStatic.Database(data)
  initialized = true
  initError = null
}
