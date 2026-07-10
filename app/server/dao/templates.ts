import type { SqlJsDatabase } from '../db'
import type { Template } from '../../types/index'

export function insertTemplate(db: SqlJsDatabase, template: Template): void {
  db.run(
    'INSERT INTO templates (id, name, provider, preview_url, is_custom, custom_background_ref) VALUES (?, ?, ?, ?, ?, ?)',
    [template.id, template.name, template.provider, template.previewUrl, template.isCustom ? 1 : 0, template.customBackgroundRef ?? null]
  )
}

export function updateTemplate(db: SqlJsDatabase, id: string, patch: Partial<Template>): void {
  const fields: string[] = []
  const values: unknown[] = []
  const keys = ['name', 'provider', 'previewUrl', 'isCustom', 'customBackgroundRef'] as const
  for (const key of keys) {
    if (key in patch) {
      fields.push(`${key} = ?`)
      const val = (patch as Record<string, unknown>)[key]
      values.push(key === 'isCustom' ? (val ? 1 : 0) : val ?? null)
    }
  }
  if (fields.length === 0) return
  values.push(id)
  db.run(`UPDATE templates SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteTemplate(db: SqlJsDatabase, id: string): void {
  db.run('DELETE FROM templates WHERE id = ?', [id])
}

export function getTemplateById(db: SqlJsDatabase, id: string): Template | undefined {
  const result = db.exec('SELECT * FROM templates WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return undefined
  return rowToTemplate(result[0].values[0])
}

export function getAllTemplates(db: SqlJsDatabase): Template[] {
  const result = db.exec('SELECT * FROM templates ORDER BY rowid')
  if (result.length === 0) return []
  return result[0].values.map(rowToTemplate)
}

export function getTemplatesByProvider(db: SqlJsDatabase, provider: string): Template[] {
  const result = db.exec('SELECT * FROM templates WHERE provider = ? ORDER BY rowid', [provider])
  if (result.length === 0) return []
  return result[0].values.map(rowToTemplate)
}

function rowToTemplate(row: unknown[]): Template {
  return {
    id: row[0] as string,
    name: row[1] as string,
    provider: row[2] as Template['provider'],
    previewUrl: row[3] as string,
    isCustom: (row[4] as number) === 1,
    customBackgroundRef: (row[5] as string) ?? undefined,
  }
}