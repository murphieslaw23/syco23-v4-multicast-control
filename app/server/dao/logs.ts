import type { SqlJsDatabase } from '../db'
import type { LogEntry } from '../../types/index'

export function insertLog(db: SqlJsDatabase, entry: Omit<LogEntry, 'id' | 'timestamp'>): void {
  const id = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  db.run(
    'INSERT INTO log_entries (id, timestamp, level, source, message) VALUES (?, ?, ?, ?, ?)',
    [id, timestamp, entry.level, entry.source, entry.message]
  )
}

export function getAllLogs(db: SqlJsDatabase, limit = 100): LogEntry[] {
  const result = db.exec('SELECT * FROM log_entries ORDER BY rowid DESC LIMIT ?', [limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToLog)
}

export function getLogsByLevel(db: SqlJsDatabase, level: LogEntry['level'], limit = 100): LogEntry[] {
  const result = db.exec('SELECT * FROM log_entries WHERE level = ? ORDER BY rowid DESC LIMIT ?', [level, limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToLog)
}

export function getLogsBySource(db: SqlJsDatabase, source: string, limit = 100): LogEntry[] {
  const result = db.exec('SELECT * FROM log_entries WHERE source = ? ORDER BY rowid DESC LIMIT ?', [source, limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToLog)
}

export function getLogsByTimeRange(db: SqlJsDatabase, from: string, to: string, limit = 100): LogEntry[] {
  const result = db.exec('SELECT * FROM log_entries WHERE timestamp >= ? AND timestamp <= ? ORDER BY rowid DESC LIMIT ?', [from, to, limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToLog)
}

export function countLogs(db: SqlJsDatabase): number {
  const result = db.exec('SELECT COUNT(*) FROM log_entries')
  if (result.length === 0) return 0
  return result[0].values[0][0] as number
}

export function clearLogs(db: SqlJsDatabase): void {
  db.run('DELETE FROM log_entries')
}

export function pruneOldLogs(db: SqlJsDatabase, keepCount: number): void {
  db.run(
    'DELETE FROM log_entries WHERE id NOT IN (SELECT id FROM log_entries ORDER BY rowid DESC LIMIT ?)',
    [keepCount]
  )
}

function rowToLog(row: unknown[]): LogEntry {
  return {
    id: row[0] as string,
    timestamp: row[1] as string,
    level: row[2] as LogEntry['level'],
    source: row[3] as string,
    message: row[4] as string,
  }
}