import type { SqlJsDatabase } from '../db'

export interface UserAssetRecord {
  id: string
  filename: string
  mimeType: string
  createdAt: string
  size: number
}

export function insertAsset(db: SqlJsDatabase, asset: Omit<UserAssetRecord, 'id' | 'createdAt'>): void {
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()
  db.run(
    'INSERT INTO user_assets (id, filename, mime_type, created_at, size) VALUES (?, ?, ?, ?, ?)',
    [id, asset.filename, asset.mimeType, createdAt, asset.size]
  )
}

export function deleteAsset(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM user_assets WHERE id = ?', [id])
}

export function getAssetById(db: SqlJsDatabase, id: string): UserAssetRecord | undefined {
  const result = db.exec('SELECT * FROM user_assets WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToAsset(result[0].values[0])
}

export function getAllAssets(db: SqlJsDatabase): UserAssetRecord[] {
  const result = db.exec('SELECT * FROM user_assets ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToAsset)
}

function rowToAsset(row: unknown[]): UserAssetRecord {
  return {
    id: row[0] as string,
    filename: row[1] as string,
    mimeType: row[2] as string,
    createdAt: row[3] as string,
    size: row[4] as number,
  }
}