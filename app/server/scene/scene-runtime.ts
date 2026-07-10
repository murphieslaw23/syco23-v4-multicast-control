import { createHash } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, extname, join, resolve } from 'node:path'
import type { SceneGraph, SceneLayer } from '../../types'
import type { PersistentDatabase } from '../persistent-db'
import { deleteAsset, getAllAssets, getAssetById, insertAsset, type UserAssetRecord } from '../dao/userAssets'

const IMAGE_MIMES = new Set(['image/png','image/jpeg','image/webp','image/svg+xml'])
function safeText(value:string):string { return value.replace(/[&<>\"]/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c]!)) }
function safeColor(value:string|undefined, fallback='#ffffff'):string { return /^#[0-9a-f]{6}$/i.test(value||'') ? value! : fallback }
export function validateScene(scene:SceneGraph):SceneGraph {
  if (!scene || !Number.isInteger(scene.width) || !Number.isInteger(scene.height) || scene.width<320 || scene.height<180 || scene.width>7680 || scene.height>4320) throw new Error('Invalid scene canvas dimensions')
  if (!Array.isArray(scene.layers) || scene.layers.length>64) throw new Error('Scene supports at most 64 layers')
  const ids=new Set<string>()
  for (const layer of scene.layers) {
    if (!layer.id || ids.has(layer.id)) throw new Error('Scene layer ids must be unique')
    ids.add(layer.id)
    if (!Number.isFinite(layer.x)||!Number.isFinite(layer.y)||!Number.isFinite(layer.zIndex)) throw new Error(`Invalid layer coordinates: ${layer.id}`)
  }
  return structuredClone(scene)
}
export function renderSceneSvg(sceneInput:SceneGraph, metadata:Record<string,string|number|undefined>={}):string {
  const scene=validateScene(sceneInput); const layers=[...scene.layers].filter(l=>l.visible!==false).sort((a,b)=>a.zIndex-b.zIndex)
  const out=[`<svg xmlns="http://www.w3.org/2000/svg" width="${scene.width}" height="${scene.height}" viewBox="0 0 ${scene.width} ${scene.height}">`,`<rect width="100%" height="100%" fill="${safeColor(scene.background,'#000000')}"/>`]
  for (const l of layers) {
    const opacity=Math.max(0,Math.min(1,l.opacity??1)); const w=l.width??0,h=l.height??0
    if (l.type==='box' || l.type==='background') out.push(`<rect x="${l.x}" y="${l.y}" width="${w||scene.width}" height="${h||scene.height}" fill="${safeColor(l.color,'#111111')}" opacity="${opacity}"/>`)
    if (['text','clock','metadata'].includes(l.type)) {
      let text=l.text||''; if(l.type==='clock') text='23:00:00'; if(l.type==='metadata') text=String(metadata[l.metadataField||'title']??`{{${l.metadataField||'title'}}}`)
      out.push(`<text x="${l.x}" y="${l.y}" fill="${safeColor(l.color)}" opacity="${opacity}" font-family="Arial,sans-serif" font-size="${Math.max(8,l.fontSize||48)}" font-weight="${l.fontWeight||700}" text-anchor="${l.align==='center'?'middle':l.align==='right'?'end':'start'}">${safeText(text)}</text>`)
    }
    if(l.type==='asset') out.push(`<rect x="${l.x}" y="${l.y}" width="${w||320}" height="${h||180}" fill="#2b2b2b" stroke="#f5f5f2" opacity="${opacity}"/><text x="${l.x+16}" y="${l.y+36}" fill="#f5f5f2" font-size="22">ASSET ${safeText(l.assetId||'')}</text>`)
  }
  out.push('</svg>'); return out.join('')
}
function escapeDrawtext(value:string):string { return value.replace(/\\/g,'\\\\').replace(/:/g,'\\:').replace(/'/g,"\\'").replace(/%/g,'\\%') }
export function compileSceneFiltergraph(sceneInput:SceneGraph, metadata:Record<string,string|number|undefined>={}):string {
  const scene=validateScene(sceneInput); const filters:string[]=[`scale=${scene.width}:${scene.height}:force_original_aspect_ratio=decrease`,`pad=${scene.width}:${scene.height}:(ow-iw)/2:(oh-ih)/2:color=${safeColor(scene.background,'#000000')}`]
  for(const l of [...scene.layers].filter(x=>x.visible!==false).sort((a,b)=>a.zIndex-b.zIndex)) {
    if(l.type==='box') filters.push(`drawbox=x=${Math.round(l.x)}:y=${Math.round(l.y)}:w=${Math.round(l.width||100)}:h=${Math.round(l.height||100)}:color=${safeColor(l.color,'#111111')}@${Math.max(0,Math.min(1,l.opacity??1))}:t=fill`)
    if(['text','clock','metadata'].includes(l.type)) {
      let text=l.text||''; if(l.type==='clock') text='%{localtime\\:%H\\:%M\\:%S}'; if(l.type==='metadata') text=String(metadata[l.metadataField||'title']??'')
      filters.push(`drawtext=text='${escapeDrawtext(text)}':x=${Math.round(l.x)}:y=${Math.round(l.y)}:fontsize=${Math.max(8,Math.round(l.fontSize||48))}:fontcolor=${safeColor(l.color)}@${Math.max(0,Math.min(1,l.opacity??1))}`)
    }
  }
  return filters.join(',')
}
export class AssetStore {
  readonly root:string
  constructor(private readonly persistence:PersistentDatabase, root=join(process.cwd(),'data/assets')) { this.root=resolve(root) }
  async initialize(){ await mkdir(this.root,{recursive:true}) }
  list(){ return getAllAssets(this.persistence.database).map(a=>({...a,storagePath:undefined})) }
  get(id:string){ return getAssetById(this.persistence.database,id) }
  async create(input:{filename:string;mimeType:string;base64:string}):Promise<UserAssetRecord>{
    if(!IMAGE_MIMES.has(input.mimeType)) throw new Error('Unsupported asset MIME type')
    const bytes=Buffer.from(input.base64,'base64'); if(!bytes.length||bytes.length>10_000_000) throw new Error('Asset must be between 1 byte and 10 MB')
    const id=crypto.randomUUID(), extension=extname(input.filename).toLowerCase()||({ 'image/png':'.png','image/jpeg':'.jpg','image/webp':'.webp','image/svg+xml':'.svg' }[input.mimeType]||'')
    const path=join(this.root,`${id}${extension}`); await writeFile(path,bytes,{flag:'wx'})
    const record={id,filename:basename(input.filename),mimeType:input.mimeType,createdAt:new Date().toISOString(),size:bytes.length,storagePath:path,sha256:createHash('sha256').update(bytes).digest('hex')}
    await this.persistence.transaction(db=>insertAsset(db,record)); return record
  }
  async remove(id:string){ const asset=this.get(id); if(!asset) throw new Error('Asset not found'); await unlink(asset.storagePath).catch(e=>{if((e as NodeJS.ErrnoException).code!=='ENOENT') throw e}); await this.persistence.transaction(db=>deleteAsset(db,id)) }
  async bytes(id:string){ const asset=this.get(id); if(!asset) throw new Error('Asset not found'); return {asset,bytes:await readFile(asset.storagePath)} }
}

function escapeFilterPath(value:string):string { return value.replace(/\\/g,'/').replace(/:/g,'\\:').replace(/'/g,"\\'") }
export function compileSceneFilterComplex(sceneInput:SceneGraph, metadata:Record<string,string|number|undefined>={}, assetPaths:Record<string,string>={}, suffix='0'):{graph:string;outputLabel:string} {
  const scene=validateScene(sceneInput)
  const layers=[...scene.layers].filter(x=>x.visible!==false).sort((a,b)=>a.zIndex-b.zIndex)
  const statements:string[]=[]
  let current=`base_${suffix}_0`
  statements.push(`[0:v]scale=${scene.width}:${scene.height}:force_original_aspect_ratio=decrease,pad=${scene.width}:${scene.height}:(ow-iw)/2:(oh-ih)/2:color=${safeColor(scene.background,'#000000')}[${current}]`)
  let step=0,assetIndex=0
  for(const l of layers) {
    const next=`base_${suffix}_${++step}`
    if(l.type==='asset') {
      const path=l.assetId ? assetPaths[l.assetId] : undefined
      if(!path) throw new Error(`Scene asset ${l.assetId || l.id} is unresolved`)
      const assetLabel=`asset_${suffix}_${assetIndex++}`
      statements.push(`movie='${escapeFilterPath(path)}',scale=${Math.max(1,Math.round(l.width||320))}:${Math.max(1,Math.round(l.height||180))}[${assetLabel}]`)
      statements.push(`[${current}][${assetLabel}]overlay=x=${Math.round(l.x)}:y=${Math.round(l.y)}:format=auto:alpha=${Math.max(0,Math.min(1,l.opacity??1))}[${next}]`)
      current=next; continue
    }
    let filter=''
    if(l.type==='box') filter=`drawbox=x=${Math.round(l.x)}:y=${Math.round(l.y)}:w=${Math.round(l.width||100)}:h=${Math.round(l.height||100)}:color=${safeColor(l.color,'#111111')}@${Math.max(0,Math.min(1,l.opacity??1))}:t=fill`
    if(['text','clock','metadata'].includes(l.type)) {
      let text=l.text||''; if(l.type==='clock') text='%{localtime\\:%H\\:%M\\:%S}'; if(l.type==='metadata') text=String(metadata[l.metadataField||'title']??'')
      filter=`drawtext=text='${escapeDrawtext(text)}':x=${Math.round(l.x)}:y=${Math.round(l.y)}:fontsize=${Math.max(8,Math.round(l.fontSize||48))}:fontcolor=${safeColor(l.color)}@${Math.max(0,Math.min(1,l.opacity??1))}`
    }
    if(!filter) continue
    statements.push(`[${current}]${filter}[${next}]`); current=next
  }
  const outputLabel=`sceneout_${suffix}`
  statements.push(`[${current}]format=yuv420p[${outputLabel}]`)
  return {graph:statements.join(';'),outputLabel}
}
