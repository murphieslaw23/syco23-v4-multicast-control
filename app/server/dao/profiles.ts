import type { SqlJsDatabase } from '../db'
import type { OutputProfile } from '../../contracts/domain'

const PROFILE_COLUMNS = 'id,name,provider,width,height,video_bitrate,audio_bitrate,fps,codec,version,created_at,updated_at'

export function insertProfile(db: SqlJsDatabase, profile: OutputProfile): void {
  db.run(
    `INSERT INTO output_profiles (${PROFILE_COLUMNS}) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      profile.id,
      profile.name,
      profile.provider,
      profile.width,
      profile.height,
      profile.videoBitrate,
      profile.audioBitrate,
      profile.fps,
      profile.codec,
      profile.version ?? 1,
      profile.createdAt ?? '',
      profile.updatedAt ?? '',
    ],
  )
}

export function updateProfile(db: SqlJsDatabase, id: string, patch: Partial<OutputProfile>): void {
  const fields: string[] = []
  const values: unknown[] = []
  const mapping: Record<keyof OutputProfile, string> = {
    id: 'id',
    name: 'name',
    provider: 'provider',
    width: 'width',
    height: 'height',
    videoBitrate: 'video_bitrate',
    audioBitrate: 'audio_bitrate',
    fps: 'fps',
    codec: 'codec',
    version: 'version',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
  for (const [key, column] of Object.entries(mapping) as Array<[keyof OutputProfile, string]>) {
    if (key === 'id' || !(key in patch)) continue
    fields.push(`${column} = ?`)
    values.push(patch[key] ?? null)
  }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE output_profiles SET ${fields.join(', ')} WHERE id = ?`, values)
  if (!db.getRowsModified()) throw new Error('Output profile not found')
}

export function deleteProfile(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM output_profiles WHERE id = ?', [id])
  if (!db.getRowsModified()) throw new Error('Output profile not found')
}

export function getProfileById(db: SqlJsDatabase, id: string): OutputProfile | undefined {
  const result = db.exec(`SELECT ${PROFILE_COLUMNS} FROM output_profiles WHERE id = ?`, [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToProfile(result[0].values[0])
}

export function getAllProfiles(db: SqlJsDatabase): OutputProfile[] {
  const result = db.exec(`SELECT ${PROFILE_COLUMNS} FROM output_profiles ORDER BY name,id`)
  if (result.length === 0) return []
  return result[0].values.map(rowToProfile)
}

function rowToProfile(row: unknown[]): OutputProfile {
  return {
    id: String(row[0]),
    name: String(row[1]),
    provider: row[2] as OutputProfile['provider'],
    width: Number(row[3]),
    height: Number(row[4]),
    videoBitrate: Number(row[5]),
    audioBitrate: Number(row[6]),
    fps: Number(row[7]),
    codec: String(row[8]),
    version: Number(row[9] || 1),
    createdAt: String(row[10] || ''),
    updatedAt: String(row[11] || ''),
  }
}
