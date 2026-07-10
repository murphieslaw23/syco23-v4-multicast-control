<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useTemplates } from '../composables/useTemplates'
import { useTransmissionKit } from '../composables/useTransmissionKit'
import SceneEditor from './SceneEditor.vue'
import type { Provider, SceneGraph, Template, DestinationState } from '../contracts/domain'
import { runtimeApi } from '../services/runtime-api'

const { templates, loading, error, load, createTemplate, updateTemplate, removeTemplate, getByProvider } = useTemplates()
const { current: kit, generate: generateKit, reset: resetKit, loading: kitLoading, error: kitError } = useTransmissionKit()
const selectedProvider = ref<Provider | 'all'>('all')
const destinations = ref<DestinationState[]>([])
const selectedDestinationId = ref('')
const editing = ref<Template | null | undefined>(undefined)
const saving = ref(false)
const actionError = ref<string | null>(null)
const providers: Provider[] = ['youtube','telegram','tiktok','twitch','instagram','mixer','mixcloud','facebook','custom-rtmp']
const filteredTemplates = computed(() => selectedProvider.value === 'all' ? templates.value : getByProvider(selectedProvider.value))

onMounted(async () => {
  await load()
  try { destinations.value = await runtimeApi.destinations(); selectedDestinationId.value = destinations.value[0]?.id || '' } catch (cause) { actionError.value = cause instanceof Error ? cause.message : String(cause) }
})
async function save(payload: { name: string; provider: Provider; scene: SceneGraph }): Promise<void> {
  saving.value = true; actionError.value = null
  try {
    if (editing.value) await updateTemplate(editing.value.id, payload)
    else await createTemplate({ ...payload, isCustom: true })
    editing.value = undefined
  } catch (cause) { actionError.value = cause instanceof Error ? cause.message : String(cause) } finally { saving.value = false }
}
async function remove(id: string): Promise<void> {
  if (!confirm('Delete this template permanently?')) return
  try { await removeTemplate(id) } catch (cause) { actionError.value = cause instanceof Error ? cause.message : String(cause) }
}
async function createKit(template: Template): Promise<void> {
  actionError.value = null
  if (!selectedDestinationId.value) { actionError.value = 'Select a destination before generating a transmission kit.'; return }
  const destination = destinations.value.find((item) => item.id === selectedDestinationId.value)
  if (!destination) { actionError.value = 'Selected destination is unavailable.'; return }
  if (destination.provider !== template.provider && template.provider !== 'custom-rtmp') { actionError.value = `Template provider ${template.provider} does not match destination provider ${destination.provider}.`; return }
  try { await generateKit({ destinationId: destination.id, templateId: template.id }) } catch (cause) { actionError.value = cause instanceof Error ? cause.message : String(cause) }
}
function previewUrl(template: Template): string { return `/api/templates/${encodeURIComponent(template.id)}/preview.svg?v=${template.version || 1}` }
</script>

<template>
  <section class="syco-templates">
    <div class="syco-panel">
      <div class="syco-panel-header"><h2 class="syco-panel-title">TEMPLATE GALLERY</h2><button class="syco-btn-sm" @click="editing = editing === undefined ? null : undefined">{{ editing === undefined ? 'BUILD' : 'CLOSE EDITOR' }}</button></div>
      <SceneEditor v-if="editing !== undefined" :template="editing" @save="save" @cancel="editing = undefined" />
      <p v-if="saving" class="status">SAVING SCENE…</p>
      <p v-if="error || actionError || kitError" class="error" role="alert">{{ actionError || error || kitError }}</p>
      <label class="destination-select"><span>TRANSMISSION DESTINATION</span><select v-model="selectedDestinationId"><option value="">Select destination</option><option v-for="destination in destinations" :key="destination.id" :value="destination.id">{{ destination.label }} · {{ destination.provider }}</option></select></label>
      <div class="syco-filters"><button class="syco-filter-btn" :class="{ active:selectedProvider==='all' }" @click="selectedProvider='all'">ALL</button><button v-for="p in providers" :key="p" class="syco-filter-btn" :class="{ active:selectedProvider===p }" @click="selectedProvider=p">{{ p }}</button></div>
      <div v-if="loading" class="syco-empty">Loading templates…</div>
      <div v-else class="syco-gallery">
        <article v-for="tmpl in filteredTemplates" :key="tmpl.id" class="syco-template-card">
          <div class="preview-frame"><img :src="previewUrl(tmpl)" :alt="`${tmpl.name} preview`" loading="lazy" /></div>
          <div class="syco-template-name">{{ tmpl.name }}</div><div class="meta">{{ tmpl.provider }} · v{{ tmpl.version || 1 }} · {{ tmpl.scene?.width }}×{{ tmpl.scene?.height }}</div>
          <div class="syco-template-actions"><button class="syco-btn-sm" @click="editing=tmpl">EDIT</button><button class="syco-btn-sm" :disabled="kitLoading" @click="createKit(tmpl)">KIT</button><button class="syco-btn-danger-sm" @click="remove(tmpl.id)">DEL</button></div>
        </article>
      </div>
      <div v-if="!loading && filteredTemplates.length===0" class="syco-empty">No templates for this provider</div>
      <div v-if="kit" class="syco-kit-output"><h3 class="syco-kit-title">TRANSMISSION KIT</h3><div class="syco-kit-section"><span class="syco-kit-label">TITLE</span><span>{{ kit.titleBlock }}</span></div><div class="syco-kit-section"><span class="syco-kit-label">DESCRIPTION</span><span>{{ kit.descriptionBlock }}</span></div><button class="syco-btn-sm" @click="resetKit()">CLEAR</button></div>
    </div>
  </section>
</template>

<style scoped>
.syco-panel{background:var(--syco-surface-2);border:1px solid var(--syco-border);padding:var(--syco-space-4)}.syco-panel-header,.syco-template-actions,.syco-filters{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.syco-panel-header{justify-content:space-between;margin-bottom:12px}.syco-panel-title{font:700 .75rem var(--syco-font-display);letter-spacing:.12em;color:var(--syco-text-muted);margin:0}.syco-btn-sm,.syco-filter-btn,.syco-btn-danger-sm{background:var(--syco-surface-3);border:1px solid var(--syco-border);color:var(--syco-text);font:10px var(--syco-font-mono);padding:7px 9px;cursor:pointer}.syco-btn-danger-sm{background:transparent;border-color:var(--syco-danger);color:var(--syco-danger)}.syco-filter-btn{background:transparent;color:var(--syco-text-muted);text-transform:uppercase}.syco-filter-btn.active{border-color:var(--syco-rust);color:var(--syco-rust)}.syco-filters{margin:16px 0}.syco-gallery{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px}.syco-template-card{border:1px solid var(--syco-border);padding:10px;display:grid;gap:8px}.preview-frame{aspect-ratio:16/9;background:#000;border:1px solid var(--syco-border);display:grid;place-items:center;overflow:hidden}.preview-frame img{width:100%;height:100%;object-fit:contain}.syco-template-name{font-weight:700}.meta,.status,.error,.syco-empty{font:11px var(--syco-font-mono);color:var(--syco-text-muted)}.error{color:var(--syco-danger)}.syco-empty{text-align:center;padding:24px}.syco-kit-output{margin-top:16px;border:1px solid var(--syco-border);padding:12px;background:var(--syco-surface-1)}.syco-kit-title,.syco-kit-label{font:700 10px var(--syco-font-mono);letter-spacing:.1em;color:var(--syco-text-muted)}.syco-kit-section{display:grid;gap:4px;margin:8px 0}
.destination-select{display:grid;gap:5px;margin:12px 0;font:10px var(--syco-font-mono);letter-spacing:.08em;color:var(--syco-text-muted)}.destination-select select{background:var(--syco-surface-1);border:1px solid var(--syco-border);color:var(--syco-text);padding:8px}
</style>
