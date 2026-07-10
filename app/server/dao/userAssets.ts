import type { SqlJsDatabase } from '../db'
export interface UserAssetRecord { id:string; filename:string; mimeType:string; createdAt:string; size:number; storagePath:string; sha256:string }
export function insertAsset(db:SqlJsDatabase, input:UserAssetRecord | Omit<UserAssetRecord,'id'|'createdAt'>):void { const asset:UserAssetRecord = 'id' in input ? input : { ...input, id:crypto.randomUUID(), createdAt:new Date().toISOString() }; db.run('INSERT INTO user_assets (id,filename,mime_type,created_at,size,storage_path,sha256) VALUES (?,?,?,?,?,?,?)',[asset.id,asset.filename,asset.mimeType,asset.createdAt,asset.size,asset.storagePath,asset.sha256]) }
export function deleteAsset(db:SqlJsDatabase,id:string):void { db.run('DELETE FROM user_assets WHERE id=?',[id]) }
export function getAssetById(db:SqlJsDatabase,id:string):UserAssetRecord|undefined { const r=db.exec('SELECT * FROM user_assets WHERE id=?',[id]); return r[0]?.values[0] ? row(r[0].values[0]) : undefined }
export function getAllAssets(db:SqlJsDatabase):UserAssetRecord[] { const r=db.exec('SELECT * FROM user_assets ORDER BY created_at DESC'); return r[0]?.values.map(row) ?? [] }
function row(v:unknown[]):UserAssetRecord { return {id:String(v[0]),filename:String(v[1]),mimeType:String(v[2]),createdAt:String(v[3]),size:Number(v[4]),storagePath:String(v[5]||''),sha256:String(v[6]||'')} }
