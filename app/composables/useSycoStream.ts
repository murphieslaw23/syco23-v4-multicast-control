import { computed, ref, type ComputedRef } from 'vue'
import { getSycoAppState, updateSycoAppState } from './store'

export interface UseSycoStreamReturn {
  isPlaying: ComputedRef<boolean>
  togglePlay: () => void
  setVolume: (value: number) => void
}

export function useSycoStream(): UseSycoStreamReturn {
  const state = getSycoAppState()
  const volume = ref(0.8)

  const isPlaying = computed(() => state.live && state.ingestStatus === 'connected')

  function togglePlay() {
    if (state.ingestStatus === 'connected') {
      updateSycoAppState({ live: !state.live })
    }
  }

  function setVolume(value: number) {
    volume.value = Math.max(0, Math.min(1, value))
  }

  return { isPlaying, togglePlay, setVolume }
}
