<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { Provider, SceneGraph, SceneLayer, Template } from '../types'
import { runtimeApi, type ManagedAsset } from '../services/runtime-api'

const props = defineProps<{ template?: Template | null }>()
const emit = defineEmits<{ save: [payload: { name: string; provider: Provider; scene: SceneGraph }]; cancel: [] }>()

const providers: Provider[] = ['youtube','telegram','tiktok','twitch','instagram','mixer','mixcloud','facebook','custom-rtmp']
const presets = {
  landscape: { width: 1920, height: 1080, label: '16:9 LANDSCAPE' },
  portrait: { width: 1080, height: 1920, label: '9:16 VERTICAL' },
  square: { width: 1080, height: 1080, label: '1:1 SQUARE' },
} as const
const name = ref('New Transmission Scene')
const provider = ref<Provider>('youtube')
const scene = ref<SceneGraph>({ width: 1920, height: 1080, background: '#090909', layers: [] })
const selectedId = ref<string | null>(null)
const assets = ref<ManagedAsset[]>([])
const busy = ref(false)
const error = ref<string | null>(null)
const canvas = ref<HTMLElement | null>(null)
let drag: { id: string; startX: number; startY: number; x: number; y: number } | null = null

const sortedLayers = computed(() => [...scene.value.layers].sort((a,b) => a.zIndex-b.zIndex))
const selected = computed(() => scene.value.layers.find((item) => item.id === selectedId.value) || null)
const scale = computed(() => Math.min(1, 760 / scene.value.width, 520 / scene.value.height))
const canvasStyle = computed(() => ({
  width: `${scene.value.width * scale.value}px`, height: `${scene.value.height * scale.value}px`, background: scene.value.background,
}))
const safeArea = computed(() => ({ left: '5%', top: '5%', width: '90%', height: '90%' }))

function cloneScene(source: SceneGraph): SceneGraph { return JSON.parse(JSON.stringify(source)) as SceneGraph }
function hydrate(): void {
  if (props.template?.scene) {
    name.value = props.template.name
    provider.value = props.template.provider
    scene.value = cloneScene(props.template.scene)
  }
}
watch(() => props.template?.id, hydrate, { immediate: true })

function applyPreset(key: keyof typeof presets): void {
  const previous = { width: scene.value.width, height: scene.value.height }
  const target = presets[key]
  const sx = target.width / previous.width
  const sy = target.height / previous.height
  scene.value = {
    ...scene.value, width: target.width, height: target.height,
    layers: scene.value.layers.map((layer) => ({ ...layer, x: Math.round(layer.x*sx), y: Math.round(layer.y*sy), width: layer.width ? Math.round(layer.width*sx) : layer.width, height: layer.height ? Math.round(layer.height*sy) : layer.height })),
  }
}
function nextZ(): number { return scene.value.layers.reduce((max, item) => Math.max(max, item.zIndex), 0) + 1 }
function addLayer(type: SceneLayer['type']): void {
  const id = crypto.randomUUID()
  const base: SceneLayer = { id, type, x: 120, y: 120, width: 720, height: 160, zIndex: nextZ(), visible: true, opacity: 1 }
  if (type === 'text') Object.assign(base, { text: 'SYSTEM CORRUPT', fontSize: 72, fontWeight: 700, color: '#F5F5F2' })
  if (type === 'metadata') Object.assign(base, { metadataField: 'title', fontSize: 64, fontWeight: 700, color: '#F5F5F2' })
  if (type === 'clock') Object.assign(base, { fontSize: 42, color: '#FF0000' })
  if (type === 'box' || type === 'background') Object.assign(base, { color: '#2B2B2B' })
  scene.value.layers.push(base); selectedId.value = id
}
function addAssetLayer(asset: ManagedAsset): void {
  const id = crypto.randomUUID()
  scene.value.layers.push({ id, type: 'asset', assetId: asset.id, x: 120, y: 120, width: 640, height: 640, zIndex: nextZ(), visible: true, opacity: 1 })
  selectedId.value = id
}
function removeSelected(): void {
  if (!selectedId.value) return
  scene.value.layers = scene.value.layers.filter((item) => item.id !== selectedId.value)
  selectedId.value = null
}
function layerStyle(layer: SceneLayer): Record<string,string> {
  return {
    left: `${layer.x*scale.value}px`, top: `${layer.y*scale.value}px`, width: `${(layer.width || 400)*scale.value}px`, height: `${(layer.height || 100)*scale.value}px`,
    zIndex: String(layer.zIndex), opacity: String(layer.opacity ?? 1), color: layer.color || '#F5F5F2', background: layer.type === 'box' || layer.type === 'background' ? layer.color || '#2B2B2B' : 'transparent',
    fontSize: `${(layer.fontSize || 48)*scale.value}px`, fontWeight: String(layer.fontWeight || 400), textAlign: layer.align || 'left', display: layer.visible === false ? 'none' : 'flex',
  }
}
function layerText(layer: SceneLayer): string {
  if (layer.type === 'text') return layer.text || 'TEXT'
  if (layer.type === 'metadata') return `{{ ${layer.metadataField || 'title'} }}`
  if (layer.type === 'clock') return '23:23:23'
  if (layer.type === 'asset') return 'ASSET'
  return ''
}
function pointerDown(event: PointerEvent, layer: SceneLayer): void {
  selectedId.value = layer.id
  drag = { id: layer.id, startX: event.clientX, startY: event.clientY, x: layer.x, y: layer.y }
  ;(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId)
}
function pointerMove(event: PointerEvent): void {
  if (!drag) return
  const layer = scene.value.layers.find((item) => item.id === drag?.id)
  if (!layer) return
  layer.x = Math.max(0, Math.min(scene.value.width-(layer.width || 0), Math.round(drag.x+(event.clientX-drag.startX)/scale.value)))
  layer.y = Math.max(0, Math.min(scene.value.height-(layer.height || 0), Math.round(drag.y+(event.clientY-drag.startY)/scale.value)))
}
function pointerUp(): void { drag = null }
async function upload(event: Event): Promise<void> {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  busy.value = true; error.value = null
  try {
    const base64 = await new Promise<string>((resolve,reject) => { const reader = new FileReader(); reader.onload=()=>resolve(String(reader.result).split(',')[1] || ''); reader.onerror=()=>reject(reader.error); reader.readAsDataURL(file) })
    const asset = await runtimeApi.uploadAsset({ filename: file.name, mimeType: file.type, base64 })
    assets.value = [asset, ...assets.value]; addAssetLayer(asset)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) } finally { busy.value = false; (event.target as HTMLInputElement).value='' }
}
function submit(): void {
  error.value = null
  if (!name.value.trim()) { error.value = 'Template name is required'; return }
  emit('save', { name: name.value.trim(), provider: provider.value, scene: cloneScene(scene.value) })
}
onMounted(async () => { try { assets.value = await runtimeApi.assets() } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) } })
</script>

<template>
  <div class="scene-editor syco-builder">
    <div class="editor-toolbar">
      <input v-model="name" class="syco-input" aria-label="Template name" />
      <select v-model="provider" class="syco-input" aria-label="Provider"><option v-for="item in providers" :key="item" :value="item">{{ item }}</option></select>
      <button v-for="(preset,key) in presets" :key="key" class="syco-btn-sm" @click="applyPreset(key)">{{ preset.label }}</button>
    </div>
    <div class="editor-grid">
      <aside class="editor-palette">
        <h3>LAYERS</h3>
        <button class="syco-btn-sm" @click="addLayer('text')">+ TEXT</button>
        <button class="syco-btn-sm" @click="addLayer('metadata')">+ METADATA</button>
        <button class="syco-btn-sm" @click="addLayer('clock')">+ CLOCK</button>
        <button class="syco-btn-sm" @click="addLayer('box')">+ BOX</button>
        <label class="syco-btn-sm upload">{{ busy ? 'UPLOADING…' : '+ IMAGE' }}<input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" :disabled="busy" @change="upload" /></label>
        <div class="asset-list"><button v-for="asset in assets" :key="asset.id" class="asset-chip" @click="addAssetLayer(asset)">{{ asset.filename }}</button></div>
      </aside>
      <div class="editor-stage-wrap">
        <div ref="canvas" class="editor-stage" :style="canvasStyle">
          <div class="safe-area" :style="safeArea" />
          <div v-for="layer in sortedLayers" :key="layer.id" class="stage-layer" :class="{ selected: layer.id===selectedId }" :style="layerStyle(layer)" @pointerdown="pointerDown($event,layer)" @pointermove="pointerMove" @pointerup="pointerUp">{{ layerText(layer) }}</div>
        </div>
        <span class="canvas-size">{{ scene.width }} × {{ scene.height }}</span>
      </div>
      <aside class="editor-inspector">
        <h3>INSPECTOR</h3>
        <template v-if="selected">
          <label>X <input v-model.number="selected.x" type="number" /></label><label>Y <input v-model.number="selected.y" type="number" /></label>
          <label>W <input v-model.number="selected.width" type="number" min="1" /></label><label>H <input v-model.number="selected.height" type="number" min="1" /></label>
          <label>OPACITY <input v-model.number="selected.opacity" type="range" min="0" max="1" step="0.05" /></label>
          <label v-if="selected.type==='text'">TEXT <input v-model="selected.text" /></label>
          <label v-if="selected.type==='metadata'">FIELD <select v-model="selected.metadataField"><option value="title">title</option><option value="artist">artist</option><option value="show">show</option><option value="listeners">listeners</option></select></label>
          <label v-if="['text','metadata','clock'].includes(selected.type)">SIZE <input v-model.number="selected.fontSize" type="number" min="8" max="320" /></label>
          <label v-if="selected.type!=='asset'">COLOR <input v-model="selected.color" type="color" /></label>
          <button class="danger" @click="removeSelected">DELETE LAYER</button>
        </template>
        <p v-else>Select or drag a layer.</p>
      </aside>
    </div>
    <p v-if="error" class="editor-error" role="alert">{{ error }}</p>
    <div class="editor-actions"><button class="syco-btn" @click="submit">SAVE TEMPLATE</button><button class="syco-btn-sm" @click="$emit('cancel')">CANCEL</button></div>
  </div>
</template>

<style scoped>
.scene-editor{border:1px solid var(--syco-border);background:var(--syco-surface-1);padding:var(--syco-space-3)}.editor-toolbar,.editor-actions{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px}.editor-grid{display:grid;grid-template-columns:150px minmax(0,1fr) 190px;gap:12px}.editor-palette,.editor-inspector{border:1px solid var(--syco-border);padding:10px;display:flex;flex-direction:column;gap:8px}.editor-palette h3,.editor-inspector h3{font:700 .65rem var(--syco-font-mono);letter-spacing:.1em;margin:0;color:var(--syco-text-muted)}.editor-stage-wrap{min-height:360px;display:flex;align-items:center;justify-content:center;position:relative;overflow:auto;background:#050505;border:1px solid var(--syco-border)}.editor-stage{position:relative;overflow:hidden;flex:0 0 auto}.safe-area{position:absolute;border:1px dashed rgba(255,0,0,.7);pointer-events:none;z-index:999}.stage-layer{position:absolute;box-sizing:border-box;align-items:center;overflow:hidden;cursor:move;user-select:none;white-space:pre-wrap;padding:2px}.stage-layer.selected{outline:2px solid var(--syco-rust)}.canvas-size{position:absolute;right:8px;bottom:6px;font:10px var(--syco-font-mono);color:var(--syco-text-muted)}.editor-inspector label{display:grid;grid-template-columns:62px 1fr;align-items:center;gap:4px;font:10px var(--syco-font-mono)}.editor-inspector input,.editor-inspector select{min-width:0;background:#111;border:1px solid var(--syco-border);color:var(--syco-text);padding:4px}.upload input{display:none}.asset-list{display:flex;flex-direction:column;gap:4px;max-height:130px;overflow:auto}.asset-chip{background:transparent;border:1px solid var(--syco-border);color:var(--syco-text-muted);font:10px var(--syco-font-mono);text-align:left;padding:5px;overflow:hidden;text-overflow:ellipsis}.danger{background:transparent;border:1px solid var(--syco-danger);color:var(--syco-danger);padding:8px}.editor-error{color:var(--syco-danger);font:12px var(--syco-font-mono)}@media(max-width:900px){.editor-grid{grid-template-columns:1fr}.editor-palette{flex-direction:row;flex-wrap:wrap}.editor-inspector{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
