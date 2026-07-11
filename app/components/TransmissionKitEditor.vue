<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { TransmissionKit, TransmissionChecklistItem } from '../contracts/domain'

const props = defineProps<{ kit:TransmissionKit; busy?:boolean }>()
const emit = defineEmits<{ save:[patch:Partial<Pick<TransmissionKit,'titleBlock'|'descriptionBlock'|'metadata'|'labels'|'launchNotes'|'checklist'>>]; remove:[] }>()

const draft = reactive({ titleBlock:'', descriptionBlock:'', launchNotes:'', labels:'', metadata:'{}', checklist:[] as TransmissionChecklistItem[] })
const error = ref('')
const copied = ref('')
const completedCount = computed(()=>draft.checklist.filter((item)=>item.completed).length)

function sync():void {
  draft.titleBlock = props.kit.titleBlock
  draft.descriptionBlock = props.kit.descriptionBlock
  draft.launchNotes = props.kit.launchNotes
  draft.labels = props.kit.labels.join(', ')
  draft.metadata = JSON.stringify(props.kit.metadata,null,2)
  draft.checklist = (props.kit.checklist || []).map((item) => ({ ...item }))
  error.value = ''
}
watch(()=>props.kit,sync,{immediate:true,deep:true})

async function copyText(name:string,text:string):Promise<void> {
  if (!navigator.clipboard?.writeText) { error.value = 'Clipboard access is unavailable in this browser.'; return }
  await navigator.clipboard.writeText(text)
  copied.value = name
  window.setTimeout(()=>{ if(copied.value===name) copied.value='' },1500)
}
function save():void {
  error.value = ''
  try {
    const metadata = JSON.parse(draft.metadata) as Record<string,string>
    if (!metadata || Array.isArray(metadata) || typeof metadata !== 'object') throw new Error('Metadata must be a JSON object.')
    emit('save',{
      titleBlock:draft.titleBlock.trim(), descriptionBlock:draft.descriptionBlock.trim(), launchNotes:draft.launchNotes.trim(),
      labels:draft.labels.split(',').map((item)=>item.trim()).filter(Boolean), metadata, checklist:draft.checklist.map((item) => ({ ...item })),
    })
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) }
}
</script>

<template>
  <section class="kit-editor">
    <header class="kit-editor__header"><div><p class="eyebrow">PROVIDER TRANSMISSION KIT</p><h3>{{ kit.titleBlock }}</h3><small>v{{ kit.version || 1 }} · {{ completedCount }}/{{ draft.checklist.length }} checks complete</small></div><div class="kit-editor__actions"><button type="button" class="control-button" @click="copyText('title',draft.titleBlock)">{{ copied==='title'?'Copied':'Copy title' }}</button><button type="button" class="danger" @click="emit('remove')">Delete</button></div></header>
    <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p>
    <div class="kit-editor__grid">
      <label>Title block<textarea v-model="draft.titleBlock" data-testid="kit-title"></textarea><button type="button" @click="copyText('title',draft.titleBlock)">Copy</button></label>
      <label>Description<textarea v-model="draft.descriptionBlock" rows="8"></textarea><button type="button" data-testid="copy-description" @click="copyText('description',draft.descriptionBlock)">Copy</button></label>
      <label>Launch notes<textarea v-model="draft.launchNotes" rows="5"></textarea><button type="button" @click="copyText('notes',draft.launchNotes)">Copy</button></label>
      <label>Labels<input v-model="draft.labels"><button type="button" @click="copyText('labels',draft.labels)">Copy</button></label>
      <label class="kit-editor__metadata">Metadata JSON<textarea v-model="draft.metadata" rows="10"></textarea><button type="button" @click="copyText('metadata',draft.metadata)">Copy</button></label>
    </div>
    <fieldset class="kit-checklist"><legend>Launch checklist</legend><label v-for="item in draft.checklist" :key="item.id"><input v-model="item.completed" type="checkbox" :data-testid="`check-${item.id}`"><span>{{ item.label }}</span><b v-if="item.required">Required</b></label></fieldset>
    <div class="kit-editor__footer"><button type="button" class="control-button" @click="sync">Reset edits</button><button type="button" class="control-button control-button--primary" data-testid="save-kit" :disabled="busy" @click="save">Save kit revision</button></div>
  </section>
</template>

<style scoped>
.kit-editor{margin-top:16px;border:1px solid var(--syco-border);background:var(--syco-surface-1);padding:14px}.kit-editor__header,.kit-editor__actions,.kit-editor__footer{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.kit-editor__header h3{margin:2px 0}.kit-editor__header small{font:10px var(--syco-font-mono);color:var(--syco-text-muted)}.kit-editor__grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:14px 0}.kit-editor__grid label{display:grid;grid-template-columns:1fr auto;gap:5px;font:10px var(--syco-font-mono);color:var(--syco-text-muted)}.kit-editor__grid textarea,.kit-editor__grid input{grid-column:1/-1;background:#090909;border:1px solid var(--syco-border);color:var(--syco-text);padding:8px;font:11px var(--syco-font-mono);resize:vertical}.kit-editor__grid button{justify-self:end;background:transparent;border:0;color:var(--syco-rust);font:10px var(--syco-font-mono);cursor:pointer}.kit-editor__metadata{grid-column:1/-1}.kit-checklist{border:1px solid var(--syco-border);display:grid;gap:7px;margin:12px 0}.kit-checklist legend{font:700 10px var(--syco-font-mono);letter-spacing:.1em}.kit-checklist label{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;font:11px var(--syco-font-mono)}.kit-checklist b{font-size:9px;color:var(--syco-rust)}@media(max-width:760px){.kit-editor__grid{grid-template-columns:1fr}.kit-editor__metadata{grid-column:auto}}
</style>
