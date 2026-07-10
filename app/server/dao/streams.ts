import type { SqlJsDatabase } from '../db'

export interface StreamRecord {
  id: string
  title: string
  artist: string
  startedAt: string
  endedAt: string | null
  status: 'online' | 'reconnecting' | 'offline' | 'standby'
}

export function insertStream(db: SqlJsDatabase, stream: Omit<StreamRecord, 'id'>): void {
  const id = crypto.randomUUID()
  db.run(
    'INSERT INTO streams (id, title, artist, started_at, ended_at, status) VALUES (?, ?, ?, ?, ?, ?)',
    [id, stream.title, stream.artist, stream.startedAt, stream.endedAt ?? null, stream.status]
  )
}

export function updateStream(db: SqlJsDatabase, id: string, patch: Partial<StreamRecord>): void {
  const fields: string[] = []
  const values: unknown[] = []
  if ('title' in patch) { fields.push('title = ?'); values.push(patch.title) }
  if ('artist' in patch) { fields.push('artist = ?'); values.push(patch.artist) }
  if ('endedAt' in patch) { fields.push('ended_at = ?'); values.push(patch.endedAt ?? null) }
  if ('status' in patch) { fields.push('status = ?'); values.push(patch.status) }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE streams SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteStream(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM streams WHERE id = ?', [id])
}

export function getStreamById(db: SqlJsDatabase, id: string): StreamRecord | undefined {
  const result = db.exec('SELECT * FROM streams WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToStream(result[0].values[0])
}

export function getAllStreams(db: SqlJsDatabase): StreamRecord[] {
  const result = db.exec('SELECT * FROM streams ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToStream)
}

function rowToStream(row: unknown[]): StreamRecord {
  return {
    id: row[0] as string,
    title: row[1] as string,
    artist: row[2] as string,
    startedAt: row[3] as string,
    endedAt: (row[4] as string) ?? null,
    status: row[5] as StreamRecord['status'],
  }
}