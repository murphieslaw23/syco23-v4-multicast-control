<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useSycoUiState } from '../composables/useSycoUiState'
import { useSourceIngest } from '../composables/useSourceIngest'
import { useSycoMetadata } from '../composables/useSycoMetadata'
import { useTemplates } from '../composables/useTemplates'
import { usePipeline } from '../composables/usePipeline'

const ui = useSycoUiState()
const ingest = useSourceIngest()
const metadata = useSycoMetadata()
const templateStore = useTemplates()
const availableTemplates = templateStore.templates
const pipeline = usePipeline()
const selectedTemplateId = ref<string>('')
const sourceUrl = ref(ui.state.sourceUrl || '')
const commandError = ref<string | null>(null)
const busy = ref(false)
onMounted(() => void templateStore.load())
async function startTransmission() {
  busy.value = true; commandError.value = null
  try { await pipeline.start({ sourceUrl: sourceUrl.value, destinations: ui.state.destinations.filter((item) => item.status !== 'disabled'), videoProfile: '1080p', audioProfile: '128k', templateId: selectedTemplateId.value || null }) }
  catch (cause) { commandError.value = cause instanceof Error ? cause.message : String(cause) } finally { busy.value = false }
}
async function stopTransmission() { busy.value = true; commandError.value = null; try { await pipeline.stop() } catch (cause) { commandError.value = cause instanceof Error ? cause.message : String(cause) } finally { busy.value = false } }

const statusLabel = computed(() => {
  if (!ui.state.live) return 'OFFLINE'
  if (ingest.connected.value) return 'TRANSMITTING'
  return 'CONNECTING'
})

const sourceInfo = computed(() => {
  if (!ui.state.sourceUrl) return 'No source configured'
  return ui.state.sourceUrl
})
</script>

<template>
  <section class="syco-live">
    <div class="syco-panel">
      <h2 class="syco-panel-title">SESSION</h2>
      <div class="syco-status-row">
        <span class="syco-status-badge" :class="{ live: ui.state.live }">
          {{ statusLabel }}
        </span>
        <span v-if="ui.state.uptime" class="syco-uptime">{{ ui.state.uptime }}</span>
      </div>
      <div class="syco-source-row">
        <span class="syco-label">SOURCE</span>
        <span class="syco-value">{{ sourceInfo }}</span>
      </div>
      <div class="syco-launch-form">
        <label><span class="syco-label">INPUT URL</span><input v-model="sourceUrl" class="syco-input" placeholder="https://… / rtmp://…" /></label>
        <label><span class="syco-label">SCENE TEMPLATE</span><select v-model="selectedTemplateId" class="syco-input"><option value="">NO OVERLAY</option><option v-for="tmpl in availableTemplates" :key="tmpl.id" :value="tmpl.id">{{ tmpl.name }} · {{ tmpl.provider }}</option></select></label>
      </div>
      <p v-if="commandError" class="syco-command-error" role="alert">{{ commandError }}</p>
      <div class="syco-controls"><button class="syco-btn syco-start" :disabled="busy || ui.state.live" @click="startTransmission">{{ busy ? 'WORKING…' : 'START TRANSMISSION' }}</button><button class="syco-btn" :disabled="busy || !ui.state.live" @click="stopTransmission">STOP</button><button class="syco-btn" @click="ingest.reconnect()">RECONNECT INPUT</button></div>
    </div>

    <div class="syco-panel">
      <h2 class="syco-panel-title">NOW PLAYING</h2>
      <div class="syco-metadata">
        <div class="syco-meta-title">{{ metadata.nowPlaying.value.title || '—' }}</div>
        <div class="syco-meta-artist">{{ metadata.nowPlaying.value.artist || '—' }}</div>
        <div v-if="metadata.nowPlaying.value.listeners" class="syco-meta-listeners">
          {{ metadata.nowPlaying.value.listeners }} listeners
        </div>
      </div>
    </div>

    <div class="syco-panel">
      <h2 class="syco-panel-title">PIPELINE</h2>
      <div class="syco-pipeline-status">
        <span class="syco-badge" :class="ui.state.pipelineHealth">{{ ui.state.pipelineHealth }}</span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.syco-live {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-4);
}

.syco-panel {
  background: var(--syco-surface-2);
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-4);
}

.syco-panel-title {
  font-family: var(--syco-font-display);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--syco-text-muted);
  margin: 0 0 var(--syco-space-3);
}

.syco-status-row {
  display: flex;
  align-items: center;
  gap: var(--syco-space-3);
}

.syco-status-badge {
  font-family: var(--syco-font-mono);
  font-size: 0.875rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  border: 1px solid var(--syco-border);
  color: var(--syco-text-muted);
}

.syco-status-badge.live {
  color: var(--syco-live);
  border-color: var(--syco-live);
}

.syco-uptime {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
}

.syco-source-row {
  display: flex;
  gap: var(--syco-space-2);
  margin-top: var(--syco-space-3);
}

.syco-label {
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  color: var(--syco-text-muted);
  letter-spacing: 0.1em;
}

.syco-value {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-secondary);
}

.syco-launch-form{display:grid;grid-template-columns:2fr 1fr;gap:var(--syco-space-2);margin-top:var(--syco-space-3)}.syco-launch-form label{display:grid;gap:5px}.syco-input{background:var(--syco-surface-1);border:1px solid var(--syco-border);color:var(--syco-text);font:12px var(--syco-font-mono);padding:9px;min-width:0}.syco-command-error{color:var(--syco-danger);font:11px var(--syco-font-mono)}.syco-start{border-color:var(--syco-live)!important}.syco-btn:disabled{opacity:.45;cursor:not-allowed}@media(max-width:700px){.syco-launch-form{grid-template-columns:1fr}}

.syco-controls {
  display: flex;
  gap: var(--syco-space-2);
  margin-top: var(--syco-space-3);
}

.syco-btn {
  background: var(--syco-surface-3);
  border: 1px solid var(--syco-border);
  color: var(--syco-text);
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  padding: var(--syco-space-2) var(--syco-space-3);
  cursor: pointer;
  min-height: 44px;
}

.syco-btn:hover {
  border-color: var(--syco-border-bright);
}

.syco-metadata {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-1);
}

.syco-meta-title {
  font-size: 1rem;
  font-weight: 700;
}

.syco-meta-artist {
  font-size: 0.875rem;
  color: var(--syco-text-secondary);
}

.syco-meta-listeners {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
}

.syco-badge {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  border: 1px solid var(--syco-border);
  text-transform: uppercase;
}

.syco-badge.ok {
  color: var(--syco-success);
}

.syco-badge.degraded {
  color: var(--syco-warning);
}

.syco-badge.failed {
  color: var(--syco-danger);
}
</style>
