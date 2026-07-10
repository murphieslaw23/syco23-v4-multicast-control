import type { SqlJsDatabase } from '../db'

export interface ScheduleRecord {
  id: string
  streamId: string
  scheduledStart: string
  scheduledEnd: string | null
  recurring: boolean
}

export function insertSchedule(db: SqlJsDatabase, schedule: Omit<ScheduleRecord, 'id'>): void {
  const id = crypto.randomUUID()
  db.run(
    'INSERT INTO schedules (id, stream_id, scheduled_start, scheduled_end, recurring) VALUES (?, ?, ?, ?, ?)',
    [id, schedule.streamId, schedule.scheduledStart, schedule.scheduledEnd ?? null, schedule.recurring ? 1 : 0]
  )
}

export function updateSchedule(db: SqlJsDatabase, id: string, patch: Partial<ScheduleRecord>): void {
  const fields: string[] = []
  const values: unknown[] = []
  if ('streamId' in patch) { fields.push('stream_id = ?'); values.push(patch.streamId) }
  if ('scheduledStart' in patch) { fields.push('scheduled_start = ?'); values.push(patch.scheduledStart) }
  if ('scheduledEnd' in patch) { fields.push('scheduled_end = ?'); values.push(patch.scheduledEnd ?? null) }
  if ('recurring' in patch) { fields.push('recurring = ?'); values.push(patch.recurring ? 1 : 0) }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteSchedule(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM schedules WHERE id = ?', [id])
}

export function getScheduleById(db: SqlJsDatabase, id: string): ScheduleRecord | undefined {
  const result = db.exec('SELECT * FROM schedules WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToSchedule(result[0].values[0])
}

export function getSchedulesByStream(db: SqlJsDatabase, streamId: string): ScheduleRecord[] {
  const result = db.exec('SELECT * FROM schedules WHERE stream_id = ? ORDER BY rowid', [streamId])
  if (result.length === 0) return []
  return result[0].values.map(rowToSchedule)
}

export function getAllSchedules(db: SqlJsDatabase): ScheduleRecord[] {
  const result = db.exec('SELECT * FROM schedules ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToSchedule)
}

function rowToSchedule(row: unknown[]): ScheduleRecord {
  return {
    id: row[0] as string,
    streamId: row[1] as string,
    scheduledStart: row[2] as string,
    scheduledEnd: (row[3] as string) ?? null,
    recurring: (row[4] as number) === 1,
  }
}