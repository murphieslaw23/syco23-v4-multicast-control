<script setup lang="ts">
import { computed, ref } from 'vue'
import { useLogs } from '../composables/useLogs'
import { useSycoUiState } from '../composables/useSycoUiState'
import type { LogEntry } from '../types/index'

const { entries, append, filterByLevel, clear } = useLogs()
const ui = useSycoUiState()

const activeFilter = ref<LogEntry['level'] | 'all'>('all')

const filteredEntries = computed(() => {
  if (activeFilter.value === 'all') return entries.value
  return filterByLevel(activeFilter.value)
})

const levels: Array<LogEntry['level'] | 'all'> = ['all', 'info', 'warning', 'error', 'success', 'debug']

const levelColors: Record<LogEntry['level'], string> = {
  info: 'var(--syco-text-secondary)',
  warning: 'var(--syco-amber)',
  error: 'var(--syco-danger)',
  success: 'var(--syco-success)',
  debug: 'var(--syco-text-muted)',
}

function addSampleEntry() {
  append({ level: 'info', source: 'system', message: 'Connection established' })
}
</script>

<template>
  <section class="syco-logs">
    <div class="syco-panel">
      <div class="syco-panel-header">
        <h2 class="syco-panel-title">LOGS ({{ filteredEntries.length }})</h2>
        <div class="syco-log-actions">
          <button class="syco-btn-sm" @click="addSampleEntry">TEST</button>
          <button class="syco-btn-sm" @click="clear">CLEAR</button>
        </div>
      </div>

      <div class="syco-log-filters">
        <button
          v-for="level in levels"
          :key="level"
          class="syco-filter-btn"
          :class="{ active: activeFilter === level }"
          @click="activeFilter = level"
        >
          {{ level }}
        </button>
      </div>

      <div class="syco-log-viewer">
        <div v-if="filteredEntries.length === 0" class="syco-empty">
          No log entries
        </div>
        <div
          v-for="entry in filteredEntries"
          :key="entry.id"
          class="syco-log-entry"
        >
          <span class="syco-log-ts">{{ entry.timestamp }}</span>
          <span class="syco-log-level" :style="{ color: levelColors[entry.level] }">
            {{ entry.level }}
          </span>
          <span class="syco-log-source">[{{ entry.source }}]</span>
          <span class="syco-log-message">{{ entry.message }}</span>
        </div>
      </div>
    </div>

    <div class="syco-panel">
      <h2 class="syco-panel-title">STATUS</h2>
      <div class="syco-status-grid">
        <div class="syco-status-item">
          <span class="syco-status-label">INGEST</span>
          <span class="syco-status-value" :class="ui.state.ingestStatus">{{ ui.state.ingestStatus }}</span>
        </div>
        <div class="syco-status-item">
          <span class="syco-status-label">PIPELINE</span>
          <span class="syco-status-value" :class="ui.state.pipelineHealth">{{ ui.state.pipelineHealth }}</span>
        </div>
        <div class="syco-status-item">
          <span class="syco-status-label">STREAMS</span>
          <span class="syco-status-value">{{ entries.length }}</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.syco-logs {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-4);
}
.syco-panel {
  background: var(--syco-surface-2);
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-4);
}
.syco-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--syco-space-3);
}
.syco-panel-title {
  font-family: var(--syco-font-display);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--syco-text-muted);
  margin: 0;
}
.syco-log-actions {
  display: flex;
  gap: var(--syco-space-1);
}
.syco-btn-sm {
  background: var(--syco-surface-3);
  border: 1px solid var(--syco-border);
  color: var(--syco-text);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  cursor: pointer;
  min-height: 36px;
}
.syco-log-filters {
  display: flex;
  gap: var(--syco-space-1);
  margin-bottom: var(--syco-space-3);
  flex-wrap: wrap;
}
.syco-filter-btn {
  background: transparent;
  border: 1px solid var(--syco-border);
  color: var(--syco-text-muted);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  cursor: pointer;
  text-transform: uppercase;
}
.syco-filter-btn.active {
  color: var(--syco-rust);
  border-color: var(--syco-rust);
}
.syco-log-viewer {
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid var(--syco-border);
  background: var(--syco-surface-0);
  padding: var(--syco-space-2);
  font-family: var(--syco-font-mono);
  font-size: 0.6875rem;
}
.syco-log-entry {
  display: flex;
  gap: var(--syco-space-2);
  padding: var(--syco-space-1) 0;
  border-bottom: 1px solid var(--syco-border);
  flex-wrap: wrap;
}
.syco-log-ts {
  color: var(--syco-text-muted);
}
.syco-log-level {
  width: 56px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.syco-log-source {
  color: var(--syco-text-muted);
}
.syco-log-message {
  color: var(--syco-text);
  flex: 1;
}
.syco-empty {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
  text-align: center;
  padding: var(--syco-space-6);
}
.syco-status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: var(--syco-space-3);
}
.syco-status-item {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-1);
}
.syco-status-label {
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  color: var(--syco-text-muted);
  letter-spacing: 0.1em;
}
.syco-status-value {
  font-family: var(--syco-font-mono);
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: uppercase;
}
.syco-status-value.connected {
  color: var(--syco-success);
}
.syco-status-value.failed {
  color: var(--syco-danger);
}
.syco-status-value.ok {
  color: var(--syco-success);
}
</style>
