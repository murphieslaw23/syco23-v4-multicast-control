import { computed, ref, type ComputedRef } from 'vue'
import { getSycoAppState, updateSycoAppState } from './store'

export interface UseSourceIngestReturn {
  connected: ComputedRef<boolean>
  degraded: ComputedRef<boolean>
  failed: ComputedRef<boolean>
  connect: (url: string) => void
  disconnect: () => void
  reconnect: () => void
}

export function useSourceIngest(): UseSourceIngestReturn {
  const lastSourceUrl = ref<string | null>(null)
  const state = getSycoAppState()

  const connected = computed(() => state.ingestStatus === 'connected')
  const degraded = computed(() => state.ingestStatus === 'degraded')
  const failed = computed(() => state.ingestStatus === 'failed')

  function connect(url: string) {
    lastSourceUrl.value = url
    updateSycoAppState({ sourceUrl: url, ingestStatus: 'connected' })
  }

  function disconnect() {
    updateSycoAppState({ ingestStatus: 'idle' })
  }

  function reconnect() {
    if (lastSourceUrl.value) {
      updateSycoAppState({ sourceUrl: lastSourceUrl.value, ingestStatus: 'connected' })
    }
  }

  return { connected, degraded, failed, connect, disconnect, reconnect }
}
