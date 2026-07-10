import type { SqlJsDatabase } from '../db'
import type { DestinationState } from '../../types/index'

export function insertDestination(db: SqlJsDatabase, dest: DestinationState): void {
  db.run(
    `INSERT INTO destinations (id, provider, label, protocol, endpoint_url, stream_key_ref, status, health, last_handshake_at, last_error, video_profile, audio_profile, monitor_mode, hls_playback_url, provider_ack_url, provider_metadata_url, provider_api_secret_ref, requires_manual_setup, transmission_kit_id, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      dest.id,
      dest.provider,
      dest.label,
      dest.protocol,
      dest.endpointUrl,
      dest.streamKeyRef,
      dest.status,
      dest.health,
      dest.lastHandshakeAt,
      dest.lastError,
      dest.videoProfile,
      dest.audioProfile,
      dest.monitorMode,
      dest.hlsPlaybackUrl ?? null,
      dest.providerAckUrl ?? null,
      dest.providerMetadataUrl ?? null,
      dest.providerApiSecretRef ?? null,
      dest.requiresManualPlatformSetup ? 1 : 0,
      dest.transmissionKitId,
      dest.notes,
    ]
  )
}

export function updateDestination(db: SqlJsDatabase, id: string, patch: Partial<DestinationState>): void {
  const fields: string[] = []
  const values: unknown[] = []

  const fieldMap: Record<string, { column: string; transform: (value: unknown) => unknown }> = {
    provider: { column: 'provider', transform: (value) => value },
    label: { column: 'label', transform: (value) => value },
    protocol: { column: 'protocol', transform: (value) => value },
    endpointUrl: { column: 'endpoint_url', transform: (value) => value },
    streamKeyRef: { column: 'stream_key_ref', transform: (value) => value },
    status: { column: 'status', transform: (value) => value },
    health: { column: 'health', transform: (value) => value },
    lastHandshakeAt: { column: 'last_handshake_at', transform: (value) => value },
    lastError: { column: 'last_error', transform: (value) => value },
    videoProfile: { column: 'video_profile', transform: (value) => value },
    audioProfile: { column: 'audio_profile', transform: (value) => value },
    monitorMode: { column: 'monitor_mode', transform: (value) => value },
    hlsPlaybackUrl: { column: 'hls_playback_url', transform: (value) => value },
    providerAckUrl: { column: 'provider_ack_url', transform: (value) => value },
    providerMetadataUrl: { column: 'provider_metadata_url', transform: (value) => value },
    providerApiSecretRef: { column: 'provider_api_secret_ref', transform: (value) => value },
    requiresManualPlatformSetup: { column: 'requires_manual_setup', transform: (value) => value ? 1 : 0 },
    transmissionKitId: { column: 'transmission_kit_id', transform: (value) => value },
    notes: { column: 'notes', transform: (value) => value },
  }

  for (const [key, mapping] of Object.entries(fieldMap)) {
    if (key in patch) {
      fields.push(`${mapping.column} = ?`)
      values.push(mapping.transform((patch as Record<string, unknown>)[key]))
    }
  }

  if (fields.length === 0) return

  values.push(id)
  db.run(`UPDATE destinations SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteDestination(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM destinations WHERE id = ?', [id])
}

export function getDestinationById(db: SqlJsDatabase, id: string): DestinationState | undefined {
  const result = db.exec('SELECT * FROM destinations WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToDestination(result[0].values[0])
}

export function getAllDestinations(db: SqlJsDatabase): DestinationState[] {
  const result = db.exec('SELECT * FROM destinations ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToDestination)
}

function rowToDestination(row: unknown[]): DestinationState {
  return {
    id: row[0] as string,
    provider: row[1] as DestinationState['provider'],
    label: row[2] as string,
    protocol: row[3] as 'rtmp' | 'rtmps',
    endpointUrl: row[4] as string,
    streamKeyRef: row[5] as string,
    status: row[6] as DestinationState['status'],
    health: (row[7] as DestinationState['health']) ?? null,
    lastHandshakeAt: (row[8] as string) ?? null,
    lastError: (row[9] as string) ?? null,
    videoProfile: row[10] as string,
    audioProfile: row[11] as string,
    monitorMode: row[12] as DestinationState['monitorMode'],
    hlsPlaybackUrl: (row[13] as string) ?? undefined,
    providerAckUrl: (row[14] as string) ?? undefined,
    providerMetadataUrl: (row[15] as string) ?? undefined,
    providerApiSecretRef: (row[16] as string) ?? undefined,
    requiresManualPlatformSetup: (row[17] as number) === 1,
    transmissionKitId: (row[18] as string) ?? null,
    notes: row[19] as string,
    capabilities: [],
  }
}