import type { SqlJsDatabase } from '../db'
import type { NowPlaying } from '../../composables/useSycoMetadata'

export function insertSnapshot(db: SqlJsDatabase, snapshot: NowPlaying): void {
  const id = crypto.randomUUID()
  const capturedAt = new Date().toISOString()
  db.run(
    'INSERT INTO metadata_snapshots (id, captured_at, title, artist, show_name, artwork_url, listeners, bitrate) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [id, capturedAt, snapshot.title, snapshot.artist, snapshot.show ?? null, snapshot.artworkUrl ?? null, snapshot.listeners ?? null, snapshot.bitrate ?? null]
  )
}

export function getLatestSnapshot(db: SqlJsDatabase): (NowPlaying & { id: string; capturedAt: string }) | null {
  const result = db.exec('SELECT * FROM metadata_snapshots ORDER BY rowid DESC LIMIT 1')
  if (result.length === 0 || result[0].values.length === 0) return null
  const row = result[0].values[0]
  return {
    id: row[0] as string,
    capturedAt: row[1] as string,
    title: row[2] as string,
    artist: row[3] as string,
    show: (row[4] as string) ?? null,
    artworkUrl: (row[5] as string) ?? null,
    listeners: (row[6] as number) ?? null,
    bitrate: (row[7] as number) ?? null,
  }
}

export function getAllSnapshots(db: SqlJsDatabase, limit = 100): NowPlaying[] {
  const result = db.exec('SELECT * FROM metadata_snapshots ORDER BY rowid DESC LIMIT ?', [limit])
  if (result.length === 0) return []
  return result[0].values.map((row) => ({
    title: row[2] as string,
    artist: row[3] as string,
    show: (row[4] as string) ?? null,
    artworkUrl: (row[5] as string) ?? null,
    listeners: (row[6] as number) ?? null,
    bitrate: (row[7] as number) ?? null,
  }))
}

export function clearSnapshots(db: SqlJsDatabase): void {
  db.run('DELETE FROM metadata_snapshots')
}