<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { runtimeApi, type ConfigurationRevision, type RevisionResource } from '../services/runtime-api'

type ResourceOption = { id:string; label:string; version:number }

const resource = ref<RevisionResource>('destination')
const resources = ref<ResourceOption[]>([])
const selectedId = ref('')
const revisions = ref<ConfigurationRevision[]>([])
const selectedRevision = ref<number|null>(null)
const compareRevision = ref<number|null>(null)
const loading = ref(false)
const error = ref('')
const notice = ref('')

const selectedResource = computed(() => resources.value.find((item) => item.id === selectedId.value) || null)
const selectedRecord = computed(() => revisions.value.find((item) => item.revision === selectedRevision.value) || null)
const compareRecord = computed(() => revisions.value.find((item) => item.revision === compareRevision.value) || null)
const changedFields = computed(() => {
  if (!selectedRecord.value || !compareRecord.value) return []
  const left = selectedRecord.value.snapshot
  const right = compareRecord.value.snapshot
  return Array.from(new Set([...Object.keys(left),...Object.keys(right)]))
    .filter((key) => JSON.stringify(left[key]) !== JSON.stringify(right[key]))
    .sort()
})

async function loadResources():Promise<void> {
  loading.value = true; error.value = ''; notice.value = ''
  try {
    if (resource.value === 'destination') resources.value = (await runtimeApi.destinations()).map((item) => ({ id:item.id,label:item.label,version:item.version || 1 }))
    else if (resource.value === 'schedule') resources.value = (await runtimeApi.schedules()).map((item) => ({ id:item.id,label:item.name,version:item.version || 1 }))
    else if (resource.value === 'transmission-kit') resources.value = (await runtimeApi.transmissionKits()).items.map((item) => ({ id:item.id,label:item.titleBlock,version:item.version || 1 }))
    else if (resource.value === 'profile') resources.value = (await runtimeApi.profiles()).map((item) => ({ id:item.id,label:item.name,version:item.version || 1 }))
    else resources.value = (await runtimeApi.templates()).map((item) => ({ id:item.id,label:item.name,version:item.version || 1 }))
    selectedId.value = resources.value[0]?.id || ''
    if (!selectedId.value) revisions.value = []
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) }
  finally { loading.value = false }
}

async function loadRevisions():Promise<void> {
  if (!selectedId.value) { revisions.value = []; return }
  loading.value = true; error.value = ''; notice.value = ''
  try {
    revisions.value = await runtimeApi.revisions(resource.value,selectedId.value)
    selectedRevision.value = revisions.value[0]?.revision ?? null
    compareRevision.value = revisions.value[1]?.revision ?? revisions.value[0]?.revision ?? null
  } catch (cause) { error.value = cause instanceof Error ? cause.message : String(cause) }
  finally { loading.value = false }
}

async function restore():Promise<void> {
  const item = selectedResource.value
  const revision = selectedRevision.value
  if (!item || revision === null) return
  if (!confirm(`Restore ${item.label} from revision ${revision}? A new revision will be created.`)) return
  loading.value = true; error.value = ''; notice.value = ''
  try {
    await runtimeApi.restoreRevision(resource.value,item.id,revision,item.version)
    await loadResources()
    await loadRevisions()
    notice.value = `Restored revision ${revision} as a new current revision.`
  } catch (cause) {
    const code = (cause as Error & {code?:string}).code
    const message = code === 'REVISION_CONFLICT' ? 'The resource changed on the server. Reloaded current revisions; review again before restoring.' : cause instanceof Error ? cause.message : String(cause)
    await loadResources()
    await loadRevisions()
    error.value = message
  } finally { loading.value = false }
}

watch(resource,()=>void loadResources(),{immediate:true})
watch(selectedId,()=>void loadRevisions())
</script>

<template>
<section class="revision-panel ops-panel">
  <header class="revision-panel__header"><div><p class="eyebrow">CONFIGURATION CONTROL</p><h2>Revision history</h2></div><button class="control-button" :disabled="loading" @click="loadRevisions">Refresh</button></header>
  <div class="revision-controls">
    <label>Resource<select v-model="resource" data-testid="revision-resource"><option value="destination">Destinations</option><option value="schedule">Schedules</option><option value="transmission-kit">Transmission kits</option><option value="profile">Output profiles</option><option value="template">Templates</option></select></label>
    <label>Record<select v-model="selectedId" data-testid="revision-record"><option v-for="item in resources" :key="item.id" :value="item.id">{{ item.label }} · v{{ item.version }}</option></select></label>
    <label>Restore revision<select v-model.number="selectedRevision" data-testid="restore-revision"><option v-for="item in revisions" :key="item.id" :value="item.revision">v{{ item.revision }} · {{ item.actor }} · {{ new Date(item.createdAt).toLocaleString() }}</option></select></label>
    <label>Compare with<select v-model.number="compareRevision" data-testid="compare-revision"><option v-for="item in revisions" :key="item.id" :value="item.revision">v{{ item.revision }}</option></select></label>
  </div>
  <p v-if="error" class="alert alert--error" role="alert">{{ error }}</p><p v-if="notice" class="alert" role="status">{{ notice }}</p>
  <div v-if="selectedRecord" class="revision-grid">
    <article><h3>Revision v{{ selectedRecord.revision }}</h3><pre>{{ JSON.stringify(selectedRecord.snapshot,null,2) }}</pre></article>
    <article v-if="compareRecord"><h3>Changed fields</h3><ul data-testid="revision-diff"><li v-for="field in changedFields" :key="field"><strong>{{ field }}</strong><code>{{ JSON.stringify(compareRecord.snapshot[field]) }} → {{ JSON.stringify(selectedRecord.snapshot[field]) }}</code></li></ul><p v-if="!changedFields.length" class="muted">No differences between the selected revisions.</p></article>
  </div>
  <button v-if="selectedRecord" class="control-button control-button--primary" :disabled="loading" data-testid="restore-button" @click="restore">Restore selected revision</button>
  <p v-if="!loading && !resources.length" class="empty">No revisioned resources are available.</p>
</section>
</template>

<style scoped>
.revision-panel{margin-top:16px}.revision-panel__header{display:flex;align-items:center;justify-content:space-between;gap:12px}.revision-controls{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.revision-controls label{display:grid;gap:5px;font:10px var(--syco-font-mono);letter-spacing:.08em;color:var(--syco-text-muted)}.revision-controls select{background:var(--syco-surface-1);border:1px solid var(--syco-border);color:var(--syco-text);padding:8px}.revision-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;margin:12px 0}.revision-grid article{min-width:0;border:1px solid var(--syco-border);padding:10px;background:var(--syco-surface-1)}.revision-grid h3{font:700 11px var(--syco-font-mono);letter-spacing:.08em}.revision-grid pre{max-height:320px;overflow:auto;white-space:pre-wrap;font:10px var(--syco-font-mono)}.revision-grid ul{display:grid;gap:8px;padding:0;list-style:none}.revision-grid li{display:grid;gap:3px;border-bottom:1px solid var(--syco-border);padding-bottom:7px}.revision-grid code{overflow-wrap:anywhere;font:10px var(--syco-font-mono);color:var(--syco-text-muted)}@media(max-width:760px){.revision-controls,.revision-grid{grid-template-columns:1fr}}
</style>
