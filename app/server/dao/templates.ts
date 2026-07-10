import type { SqlJsDatabase } from '../db'
import type { SceneGraph, Template } from '../../types/index'

const DEFAULT_SCENE: SceneGraph = { width: 1920, height: 1080, background: '#000000', layers: [] }

export function insertTemplate(db: SqlJsDatabase, template: Template): void {
  db.run(
    'INSERT INTO templates (id,name,provider,preview_url,is_custom,custom_background_ref,scene_json,version,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    [template.id, template.name, template.provider, template.previewUrl, template.isCustom ? 1 : 0, template.customBackgroundRef ?? null, JSON.stringify(template.scene), template.version, template.createdAt, template.updatedAt]
  )
}

export function updateTemplate(db: SqlJsDatabase, id: string, patch: Partial<Template>): void {
  const map: Record<string,string> = { name:'name', provider:'provider', previewUrl:'preview_url', isCustom:'is_custom', customBackgroundRef:'custom_background_ref', scene:'scene_json', version:'version', createdAt:'created_at', updatedAt:'updated_at' }
  const fields:string[]=[]; const values:unknown[]=[]
  for (const [key,column] of Object.entries(map)) if (key in patch) {
    fields.push(`${column}=?`)
    const value=(patch as Record<string,unknown>)[key]
    values.push(key==='isCustom' ? (value ? 1 : 0) : key==='scene' ? JSON.stringify(value) : value ?? null)
  }
  if (!fields.length) return
  values.push(id); db.run(`UPDATE templates SET ${fields.join(',')} WHERE id=?`, values)
}
export function deleteTemplate(db: SqlJsDatabase,id:string):void { db.run('DELETE FROM templates WHERE id=?',[id]) }
export function getTemplateById(db:SqlJsDatabase,id:string):Template|undefined { const r=db.exec('SELECT * FROM templates WHERE id=?',[id]); return r[0]?.values[0] ? rowToTemplate(r[0].values[0]) : undefined }
export function getAllTemplates(db:SqlJsDatabase):Template[] { const r=db.exec('SELECT * FROM templates ORDER BY updated_at DESC,rowid DESC'); return r[0]?.values.map(rowToTemplate) ?? [] }
export function getTemplatesByProvider(db:SqlJsDatabase,provider:string):Template[] { const r=db.exec('SELECT * FROM templates WHERE provider=? ORDER BY updated_at DESC',[provider]); return r[0]?.values.map(rowToTemplate) ?? [] }
function rowToTemplate(row:unknown[]):Template {
  let scene=DEFAULT_SCENE
  try { const parsed=JSON.parse(String(row[6] || '{}')); if (parsed && Number(parsed.width)>0 && Array.isArray(parsed.layers)) scene=parsed } catch {}
  return { id:String(row[0]), name:String(row[1]), provider:row[2] as Template['provider'], previewUrl:String(row[3]||''), isCustom:Number(row[4])===1, customBackgroundRef:row[5] ? String(row[5]) : undefined, scene, version:Number(row[7]||1), createdAt:String(row[8]||''), updatedAt:String(row[9]||'') }
}
