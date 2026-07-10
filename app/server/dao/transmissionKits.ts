import type { SqlJsDatabase } from '../db'
import type { TransmissionKit, Provider } from '../../types/index'

export function insertKit(db: SqlJsDatabase, kit: TransmissionKit): void {
  db.run(
    'INSERT INTO transmission_kits (id, destination_id, title_block, description_block, metadata, labels, launch_notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [kit.id, kit.destinationId, kit.titleBlock, kit.descriptionBlock, JSON.stringify(kit.metadata), JSON.stringify(kit.labels), kit.launchNotes]
  )
}

export function updateKit(db: SqlJsDatabase, id: string, patch: Partial<TransmissionKit>): void {
  const fields: string[] = []
  const values: unknown[] = []
  if ('titleBlock' in patch) { fields.push('title_block = ?'); values.push(patch.titleBlock) }
  if ('descriptionBlock' in patch) { fields.push('description_block = ?'); values.push(patch.descriptionBlock) }
  if ('metadata' in patch) { fields.push('metadata = ?'); values.push(JSON.stringify(patch.metadata)) }
  if ('labels' in patch) { fields.push('labels = ?'); values.push(JSON.stringify(patch.labels)) }
  if ('launchNotes' in patch) { fields.push('launch_notes = ?'); values.push(patch.launchNotes) }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE transmission_kits SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteKit(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM transmission_kits WHERE id = ?', [id])
}

export function getKitById(db: SqlJsDatabase, id: string): TransmissionKit | undefined {
  const result = db.exec('SELECT * FROM transmission_kits WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToKit(result[0].values[0])
}

export function getKitsByDestination(db: SqlJsDatabase, destId: string): TransmissionKit[] {
  const result = db.exec('SELECT * FROM transmission_kits WHERE destination_id = ? ORDER BY rowid', [destId])
  if (result.length === 0) return []
  return result[0].values.map(rowToKit)
}

export function getAllKits(db: SqlJsDatabase): TransmissionKit[] {
  const result = db.exec('SELECT * FROM transmission_kits ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToKit)
}

function rowToKit(row: unknown[]): TransmissionKit {
  return {
    id: row[0] as string,
    destinationId: row[1] as string,
    titleBlock: row[2] as string,
    descriptionBlock: row[3] as string,
    metadata: JSON.parse(row[4] as string),
    labels: JSON.parse(row[5] as string),
    launchNotes: row[6] as string,
  }
}

export function generateKit(destinationId: string, provider: Provider): TransmissionKit {
  return {
    id: crypto.randomUUID(),
    destinationId,
    titleBlock: `[${provider.toUpperCase()}] Show Title`,
    descriptionBlock: 'Generated for transmission.',
    metadata: { provider, generatedAt: new Date().toISOString() },
    labels: [provider, 'live'],
    launchNotes: 'Review endpoint and key before arming.',
  }
}