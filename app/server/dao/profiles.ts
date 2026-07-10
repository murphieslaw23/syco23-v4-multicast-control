import type { SqlJsDatabase } from '../db'
import type { OutputProfile } from '../../types/index'

export function insertProfile(db: SqlJsDatabase, profile: OutputProfile): void {
  db.run(
    'INSERT INTO output_profiles (id, name, provider, width, height, video_bitrate, audio_bitrate, fps, codec) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [profile.id, profile.name, profile.provider, profile.width, profile.height, profile.videoBitrate, profile.audioBitrate, profile.fps, profile.codec]
  )
}

export function updateProfile(db: SqlJsDatabase, id: string, patch: Partial<OutputProfile>): void {
  const fields: string[] = []
  const values: unknown[] = []
  const keys = ['name', 'provider', 'width', 'height', 'videoBitrate', 'audioBitrate', 'fps', 'codec'] as const
  for (const key of keys) {
    if (key in patch) {
      fields.push(`${key} = ?`)
      values.push((patch as Record<string, unknown>)[key])
    }
  }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE output_profiles SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteProfile(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM output_profiles WHERE id = ?', [id])
}

export function getProfileById(db: SqlJsDatabase, id: string): OutputProfile | undefined {
  const result = db.exec('SELECT * FROM output_profiles WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToProfile(result[0].values[0])
}

export function getAllProfiles(db: SqlJsDatabase): OutputProfile[] {
  const result = db.exec('SELECT * FROM output_profiles ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToProfile)
}

function rowToProfile(row: unknown[]): OutputProfile {
  return {
    id: row[0] as string,
    name: row[1] as string,
    provider: row[2] as OutputProfile['provider'],
    width: row[3] as number,
    height: row[4] as number,
    videoBitrate: row[5] as number,
    audioBitrate: row[6] as number,
    fps: row[7] as number,
    codec: row[8] as string,
  }
}