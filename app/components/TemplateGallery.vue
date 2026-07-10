<script setup lang="ts">
import { computed, ref } from 'vue'
import { useTemplates } from '../composables/useTemplates'
import { useTransmissionKit } from '../composables/useTransmissionKit'
import type { Provider, Template } from '../types/index'

const { templates, addTemplate, removeTemplate, getByProvider } = useTemplates()
const { current: kit, generate: generateKit, reset: resetKit } = useTransmissionKit()

const selectedProvider = ref<Provider | 'all'>('all')
const showBuilder = ref(false)
const builder = ref({
  name: '',
  provider: 'youtube' as Provider,
  backgroundRef: '',
})

const providers: Provider[] = ['youtube', 'telegram', 'tiktok', 'twitch', 'instagram', 'mixer', 'mixcloud', 'facebook', 'custom-rtmp']

const filteredTemplates = computed(() => {
  if (selectedProvider.value === 'all') return templates.value
  return getByProvider(selectedProvider.value)
})

function handleCreate() {
  if (!builder.value.name) return
  const tmpl: Template = {
    id: crypto.randomUUID(),
    name: builder.value.name,
    provider: builder.value.provider,
    previewUrl: `/previews/${crypto.randomUUID().slice(0, 8)}.png`,
    isCustom: true,
    customBackgroundRef: builder.value.backgroundRef || undefined,
  }
  addTemplate(tmpl)
  showBuilder.value = false
  builder.value = { name: '', provider: 'youtube', backgroundRef: '' }
}

function handleGenerateKit(destinationId: string, provider: Provider) {
  generateKit(destinationId, provider)
}
</script>

<template>
  <section class="syco-templates">
    <div class="syco-panel">
      <div class="syco-panel-header">
        <h2 class="syco-panel-title">TEMPLATE GALLERY</h2>
        <button class="syco-btn-sm" @click="showBuilder = !showBuilder">
          {{ showBuilder ? 'CANCEL' : 'BUILD' }}
        </button>
      </div>

      <div class="syco-filters">
        <button
          class="syco-filter-btn"
          :class="{ active: selectedProvider === 'all' }"
          @click="selectedProvider = 'all'"
        >
          ALL
        </button>
        <button
          v-for="p in providers"
          :key="p"
          class="syco-filter-btn"
          :class="{ active: selectedProvider === p }"
          @click="selectedProvider = p"
        >
          {{ p }}
        </button>
      </div>

      <div v-if="showBuilder" class="syco-builder">
        <input v-model="builder.name" class="syco-input" placeholder="Template name" />
        <select v-model="builder.provider" class="syco-input">
          <option v-for="p in providers" :key="p" :value="p">{{ p }}</option>
        </select>
        <input v-model="builder.backgroundRef" class="syco-input" placeholder="Background ref (optional)" />
        <button class="syco-btn" @click="handleCreate">CREATE TEMPLATE</button>
      </div>

      <div class="syco-gallery">
        <div v-for="tmpl in filteredTemplates" :key="tmpl.id" class="syco-template-card">
          <div class="syco-template-preview">
            <span v-if="tmpl.isCustom" class="syco-tag">CUSTOM</span>
            <span class="syco-provider-badge">{{ tmpl.provider }}</span>
          </div>
          <div class="syco-template-name">{{ tmpl.name }}</div>
          <div class="syco-template-actions">
            <button class="syco-btn-sm" @click="handleGenerateKit(tmpl.id, tmpl.provider)">
              KIT
            </button>
            <button v-if="tmpl.isCustom" class="syco-btn-danger-sm" @click="removeTemplate(tmpl.id)">
              DEL
            </button>
          </div>
        </div>
      </div>

      <div v-if="filteredTemplates.length === 0" class="syco-empty">
        No templates for this provider
      </div>

      <div v-if="kit" class="syco-kit-output">
        <h3 class="syco-kit-title">TRANSMISSION KIT</h3>
        <div class="syco-kit-section">
          <span class="syco-kit-label">TITLE</span>
          <span class="syco-kit-value">{{ kit.titleBlock }}</span>
        </div>
        <div class="syco-kit-section">
          <span class="syco-kit-label">DESCRIPTION</span>
          <span class="syco-kit-value">{{ kit.descriptionBlock }}</span>
        </div>
        <div class="syco-kit-section">
          <span class="syco-kit-label">LABELS</span>
          <span class="syco-kit-value">{{ kit.labels.join(', ') }}</span>
        </div>
        <button class="syco-btn-sm" @click="resetKit()">CLEAR</button>
      </div>
    </div>
  </section>
</template>

<style scoped>
.syco-templates {
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
.syco-btn-danger-sm {
  background: transparent;
  border: 1px solid var(--syco-danger);
  color: var(--syco-danger);
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  padding: var(--syco-space-1) var(--syco-space-2);
  cursor: pointer;
  min-height: 36px;
}
.syco-filters {
  display: flex;
  flex-wrap: wrap;
  gap: var(--syco-space-1);
  margin-bottom: var(--syco-space-4);
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
.syco-builder {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-2);
  margin-bottom: var(--syco-space-4);
  padding: var(--syco-space-3);
  border: 1px solid var(--syco-border);
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
.syco-gallery {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: var(--syco-space-3);
  margin-bottom: var(--syco-space-4);
}
.syco-template-card {
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-3);
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-2);
}
.syco-template-preview {
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 60px;
  background: var(--syco-surface-1);
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-2);
}
.syco-tag {
  font-family: var(--syco-font-mono);
  font-size: 0.5rem;
  color: var(--syco-amber);
  border: 1px solid var(--syco-amber);
  padding: 1px 4px;
  letter-spacing: 0.05em;
}
.syco-provider-badge {
  font-family: var(--syco-font-mono);
  font-size: 0.5rem;
  color: var(--syco-text-muted);
  text-transform: uppercase;
}
.syco-template-name {
  font-size: 0.75rem;
  font-weight: 700;
}
.syco-template-actions {
  display: flex;
  gap: var(--syco-space-1);
}
.syco-empty {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
  text-align: center;
  padding: var(--syco-space-6);
}
.syco-kit-output {
  border: 1px solid var(--syco-border);
  padding: var(--syco-space-4);
  background: var(--syco-surface-1);
}
.syco-kit-title {
  font-family: var(--syco-font-display);
  font-size: 0.75rem;
  letter-spacing: 0.12em;
  color: var(--syco-text-muted);
  margin: 0 0 var(--syco-space-3);
}
.syco-kit-section {
  display: flex;
  flex-direction: column;
  gap: var(--syco-space-1);
  margin-bottom: var(--syco-space-2);
}
.syco-kit-label {
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  color: var(--syco-text-muted);
  letter-spacing: 0.1em;
}
.syco-kit-value {
  font-family: var(--syco-font-body);
  font-size: 0.75rem;
  color: var(--syco-text);
}
</style>
