<script setup lang="ts">
import { computed } from 'vue'
import { useSycoUiState } from '../composables/useSycoUiState'
import { useSourceIngest } from '../composables/useSourceIngest'
import { useSycoMetadata } from '../composables/useSycoMetadata'

const ui = useSycoUiState()
const ingest = useSourceIngest()
const metadata = useSycoMetadata()

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
      <div class="syco-controls">
        <button class="syco-btn" @click="ingest.disconnect()">Disconnect</button>
        <button class="syco-btn" @click="ingest.reconnect()">Reconnect</button>
      </div>
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
