<script setup lang="ts">
import { computed } from 'vue'
import { useSycoStream } from '../composables/useSycoStream'
import { getLocalDestination } from '../composables/store'

const stream = useSycoStream()
const localDest = computed(() => getLocalDestination())

const playerClass = computed(() => ({
  'syco-player': true,
  'syco-player--active': stream.isPlaying.value || !!localDest.value,
}))

const isSelfCasting = computed(() => !!localDest.value)
</script>

<template>
  <div :class="playerClass">
    <div class="syco-player-display">
      <div v-if="!stream.isPlaying.value && !isSelfCasting" class="syco-player-offline">
        <span class="syco-player-signal">NO SIGNAL</span>
      </div>
      <div v-else-if="isSelfCasting" class="syco-player-live">
        <span class="syco-player-indicator">SELF CAST</span>
        <span class="syco-player-dest">{{ localDest?.label }}</span>
      </div>
      <div v-else class="syco-player-live">
        <span class="syco-player-indicator">LIVE PREVIEW</span>
      </div>
    </div>
    <div class="syco-player-controls">
      <button class="syco-player-btn" @click="stream.togglePlay()">
        {{ stream.isPlaying.value ? 'PAUSE' : 'PLAY' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.syco-player {
  border: 1px solid var(--syco-border);
  background: var(--syco-surface-1);
  overflow: hidden;
}

.syco-player-display {
  aspect-ratio: 16 / 9;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--syco-surface-0);
}

.syco-player-offline {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--syco-space-2);
}

.syco-player-signal {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-text-muted);
  letter-spacing: 0.15em;
}

.syco-player-live {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--syco-space-1);
}

.syco-player-indicator {
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  color: var(--syco-live);
  letter-spacing: 0.1em;
  animation: syco-blink 2s infinite;
}

@keyframes syco-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.syco-player-dest {
  font-family: var(--syco-font-mono);
  font-size: 0.625rem;
  color: var(--syco-text-muted);
  letter-spacing: 0.05em;
  margin-top: var(--syco-space-1);
}

.syco-player--active .syco-player-display {
  background: linear-gradient(135deg, var(--syco-surface-0), var(--syco-surface-2));
}

.syco-player-controls {
  padding: var(--syco-space-2);
  border-top: 1px solid var(--syco-border);
}

.syco-player-btn {
  width: 100%;
  background: var(--syco-surface-3);
  border: 1px solid var(--syco-border);
  color: var(--syco-text);
  font-family: var(--syco-font-mono);
  font-size: 0.75rem;
  padding: var(--syco-space-2);
  cursor: pointer;
  min-height: 44px;
}
</style>
