import type { SqlJsDatabase } from '../db'
import type { WatchdogEvent } from '../../composables/useWatchdog'

export function insertEvent(db: SqlJsDatabase, event: Omit<WatchdogEvent, 'id' | 'timestamp'>): void {
  const id = crypto.randomUUID()
  const timestamp = new Date().toISOString()
  db.run(
    'INSERT INTO watchdog_events (id, timestamp, source, severity, message) VALUES (?, ?, ?, ?, ?)',
    [id, timestamp, event.source, event.severity, event.message]
  )
}

export function getAllEvents(db: SqlJsDatabase, limit = 50): WatchdogEvent[] {
  const result = db.exec('SELECT * FROM watchdog_events ORDER BY rowid DESC LIMIT ?', [limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToEvent)
}

export function getEventsBySeverity(db: SqlJsDatabase, severity: string, limit = 50): WatchdogEvent[] {
  const result = db.exec('SELECT * FROM watchdog_events WHERE severity = ? ORDER BY rowid DESC LIMIT ?', [severity, limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToEvent)
}

export function getEventsByTimeRange(db: SqlJsDatabase, from: string, to: string, limit = 50): WatchdogEvent[] {
  const result = db.exec('SELECT * FROM watchdog_events WHERE timestamp >= ? AND timestamp <= ? ORDER BY rowid DESC LIMIT ?', [from, to, limit])
  if (result.length === 0) return []
  return result[0].values.map(rowToEvent)
}

export function getRecentEvents(db: SqlJsDatabase, count: number): WatchdogEvent[] {
  const result = db.exec('SELECT * FROM watchdog_events ORDER BY rowid DESC LIMIT ?', [count])
  if (result.length === 0) return []
  return result[0].values.map(rowToEvent)
}

export function clearEvents(db: SqlJsDatabase): void {
  db.run('DELETE FROM watchdog_events')
}

function rowToEvent(row: unknown[]): WatchdogEvent {
  return {
    id: row[0] as string,
    timestamp: row[1] as string,
    source: row[2] as string,
    severity: row[3] as WatchdogEvent['severity'],
    message: row[4] as string,
  }
}