<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRuntimeDestinationMatrix, type DestinationMatrixApi } from '../composables/useRuntimeDestinationMatrix'
import type { Provider, DestinationStatus } from '../types/index'

const props = defineProps<{ api?: DestinationMatrixApi }>()
const matrix = useRuntimeDestinationMatrix(props.api)
const { destinations, loading, error } = matrix

const showForm = ref(false)
const form = ref({
  provider: 'youtube' as Provider,
  label: '',
  endpointUrl: '',
  streamKeyRef: '',
  videoProfile: '1080p',
  audioProfile: '128k',
})

const providers: Provider[] = ['local', 'youtube', 'telegram', 'tiktok', 'twitch', 'instagram', 'mixer', 'mixcloud', 'facebook', 'custom-rtmp']

async function handleAdd() {
  if (!form.value.label) return
  await matrix.add({
    id: crypto.randomUUID(),
    provider: form.value.provider,
    label: form.value.label,
    protocol: 'rtmps',
    endpointUrl: form.value.endpointUrl,
    streamKeyRef: form.value.streamKeyRef,
    status: 'configured',
    health: null,
    lastHandshakeAt: null,
    lastError: null,
    videoProfile: form.value.videoProfile,
    audioProfile: form.value.audioProfile,
    monitorMode: 'rtmp-output',
    requiresManualPlatformSetup: false,
    capabilities: [],
    transmissionKitId: null,
    notes: '',
  })
  showForm.value = false
  form.value = { provider: 'youtube', label: '', endpointUrl: '', streamKeyRef: '', videoProfile: '1080p', audioProfile: '128k' }
}

async function cycleStatus(id: string, current: DestinationStatus) {
  const next: Record<DestinationStatus, DestinationStatus> = {
    idle: 'configured',
    configured: 'armed',
    armed: 'connecting',
    connecting: 'live',
    live: 'idle',
    degraded: 'idle',
    failed: 'configured',
    cooldown: 'idle',
    disabled: 'idle',
  }
  await matrix.updateStatus(id, next[current])
}

onMounted(() => void matrix.load())

const statusColors: Record<DestinationStatus, string> = {
  idle: 'var(--syco-text-muted)',
  configured: 'var(--syco-text-secondary)',
  armed: 'var(--syco-amber)',
  connecting: 'var(--syco-turquoise)',
  live: 'var(--syco-live)',
  degraded: 'var(--syco-warning)',
  failed: 'var(--syco-danger)',
  cooldown: 'var(--syco-text-muted)',
  disabled: 'var(--syco-text-muted)',
}
</script>

<template>
  <section class="syco-destinations">
    <div class="syco-panel">
      <div class="syco-panel-header">
        <h2 class="syco-panel-title">DESTINATIONS</h2>
        <button class="syco-btn-sm" type="button" :disabled="loading" @click="showForm = !showForm">
          {{ showForm ? 'CANCEL' : 'ADD' }}
        </button>
      </div>

      <form v-if="showForm" class="syco-form" @submit.prevent="handleAdd">
        <label>Provider<select v-model="form.provider" class="syco-input">
          <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
        </select></label>
        <label>Label<input v-model="form.label" class="syco-input" placeholder="Primary YouTube" required></label>
        <label>RTMP URL<input v-model="form.endpointUrl" class="syco-input" inputmode="url" placeholder="rtmps://…"></label>
        <label>Secret reference<input v-model="form.streamKeyRef" class="syco-input" autocomplete="off" placeholder="env:YOUTUBE_STREAM_KEY"></label>
        <button type="submit" class="syco-btn">SAVE</button>
      </form>

      <p v-if="error" class="syco-error" role="alert">{{ error }}</p>
      <div v-if="!loading && destinations.length === 0" class="syco-empty">
        No destinations configured
      </div>

      <div v-for="dest in destinations" :key="dest.id" class="syco-dest-card">
        <div class="syco-dest-header">
          <span class="syco-dest-label">
            {{ dest.label }}
            <span v-if="dest.provider === 'local'" class="syco-dest-local-badge">SELF</span>
          </span>
          <button
            type="button"
            class="syco-dest-status"
            :class="{ 'syco-dest-status--local': dest.provider === 'local' }"
            :style="{ color: statusColors[dest.status] }"
            :aria-label="`Advance ${dest.label} status from ${dest.status}`"
            :disabled="loading"
            @click="cycleStatus(dest.id, dest.status)"
          >
            {{ dest.status }}
          </button>
        </div>
        <div class="syco-dest-meta">
          <span>{{ dest.provider }}</span>
          <span>{{ dest.videoProfile }}</span>
        </div>
        <button class="syco-btn-danger" type="button" :disabled="loading" @click="matrix.remove(dest.id)">Remove</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.syco-destinations {
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

.syco-form label {
  display: grid;
  gap: var(--syco-space-1);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.syco-form {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-2);
  margin-bottom: var(--syco-space-4);
}

.syco-input {
  background: var(--syco-surface-1);
  border: 1px solid var(--syco-border);
  color: var(--syco-text);
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  padding: var(--syco-space-2);
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

.syco-btn-danger {
  background: transparent;
  border: 1px solid var(--syco-danger);
  color: var(--syco-danger);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  cursor: pointer;
  min-height: 36px;
}

.syco-error {
  color: var(--syco-danger);
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
}

.syco-empty {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
  text-align: center;
  padding: var(--syco-space-6);
}

.syco-dest-card {
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-3);
  margin-bottom: var(--syco-space-2);
}

.syco-dest-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.syco-dest-label {
  font-weight: 700;
  font-size: 0.875rem;
}

.syco-dest-status {
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  text-transform: uppercase;
  cursor: pointer;
  letter-spacing: 0.05em;
  background: transparent;
  border: 1px solid currentColor;
  min-height: 36px;
  padding: var(--syco-space-1) var(--syco-space-2);
}


.syco-dest-meta {
  display: flex;
  gap: var(--syco-space-3);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  color: var(--syco-text-muted);
  margin-top: var(--syco-space-2);
}

.syco-dest-local-badge {
  font-family: var(--syco-font-mono);
  font-size: 0.5rem;
  color: var(--syco-turquoise);
  border: 1px solid var(--syco-turquoise);
  padding: 1px 4px;
  letter-spacing: 0.05em;
  margin-left: var(--syco-space-2);
  vertical-align: middle;
}

.syco-dest-status--local {
  font-weight: 700;
}
</style>
