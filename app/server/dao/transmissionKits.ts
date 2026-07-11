import type { SqlJsDatabase } from '../db'
import type { TransmissionKit, Provider, Template } from '../../contracts/domain'

export function insertKit(db: SqlJsDatabase, kit: TransmissionKit): void {
  db.run(
    'INSERT INTO transmission_kits (id, destination_id, title_block, description_block, metadata, labels, launch_notes, version, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [kit.id, kit.destinationId, kit.titleBlock, kit.descriptionBlock, JSON.stringify(kit.metadata), JSON.stringify(kit.labels), kit.launchNotes, kit.version ?? 1, kit.createdAt ?? new Date().toISOString(), kit.updatedAt ?? new Date().toISOString()]
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
  if ('version' in patch) { fields.push('version = ?'); values.push(patch.version) }
  if ('updatedAt' in patch) { fields.push('updated_at = ?'); values.push(patch.updatedAt) }
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
    version: Number(row[7] ?? 1),
    createdAt: String(row[8] ?? ''),
    updatedAt: String(row[9] ?? ''),
  }
}

export interface GenerateTransmissionKitInput {
  destinationId: string
  provider: Provider
  destinationLabel?: string
  template?: Pick<Template, 'id' | 'name' | 'provider'> | null
  title?: string
  artist?: string
  show?: string
  publicUrl?: string
}

const providerCopy: Record<Provider, { labels: string[]; launchNotes: string }> = {
  youtube: { labels: ['youtube', 'livestream', 'syco23'], launchNotes: 'Verify the YouTube control-room preview, latency mode, category, thumbnail, and public visibility before arming.' },
  telegram: { labels: ['telegram', 'vertical', 'syco23'], launchNotes: 'Confirm the Telegram destination supports the selected orientation and publish the listener access message after provider acknowledgement.' },
  tiktok: { labels: ['tiktok', 'vertical', 'syco23'], launchNotes: 'Confirm mobile-safe framing, platform eligibility, and the live preview before publishing.' },
  twitch: { labels: ['twitch', 'live', 'syco23'], launchNotes: 'Confirm category, title, moderation state, and playback acknowledgement before announcing the transmission.' },
  instagram: { labels: ['instagram', 'vertical', 'syco23'], launchNotes: 'Confirm portrait framing and platform-side live readiness; Instagram may require manual setup.' },
  mixer: { labels: ['mixer', 'legacy', 'syco23'], launchNotes: 'This provider is retained for compatibility. Verify the endpoint is active before arming.' },
  mixcloud: { labels: ['mixcloud', 'live', 'syco23'], launchNotes: 'Confirm Mixcloud Live title, rights metadata, and playback acknowledgement.' },
  facebook: { labels: ['facebook', 'live', 'syco23'], launchNotes: 'Confirm destination page, visibility, title, and provider acknowledgement before publishing.' },
  'custom-rtmp': { labels: ['rtmp', 'live', 'syco23'], launchNotes: 'Verify the custom RTMP endpoint, secret reference, codec profile, and public playback URL.' },
  local: { labels: ['local', 'preview', 'syco23'], launchNotes: 'Use this kit for local validation only; no external provider acknowledgement is expected.' },
}

export function generateKit(input: GenerateTransmissionKitInput): TransmissionKit {
  const title = input.title?.trim() || input.show?.trim() || 'SYSTEM CORRUPT — LIVE TRANSMISSION'
  const artistLine = input.artist?.trim() ? ` — ${input.artist.trim()}` : ''
  const provider = input.provider
  const templateName = input.template?.name || 'Default SYCO23 scene'
  const destination = input.destinationLabel || input.destinationId
  const publicLine = input.publicUrl ? `

Listen / watch: ${input.publicUrl}` : ''
  const descriptionBlock = [
    `${title}${artistLine}`,
    '',
    `SYSTEM CORRUPT / SYCO23 live transmission to ${destination}.`,
    `Visual format: ${templateName}.`,
    publicLine,
    '',
    'Underground radio. Freetekno signal. No commercial interruption.',
  ].filter((line, index, lines) => line !== '' || (index > 0 && lines[index - 1] !== '')).join('\n')

  return {
    id: crypto.randomUUID(),
    destinationId: input.destinationId,
    titleBlock: `[SYCO23] ${title}`,
    descriptionBlock,
    metadata: {
      provider,
      templateId: input.template?.id || '',
      templateName,
      show: input.show || '',
      artist: input.artist || '',
      generatedAt: new Date().toISOString(),
    },
    labels: providerCopy[provider].labels,
    launchNotes: providerCopy[provider].launchNotes,
  }
}
