import { computed, type ComputedRef } from 'vue'
import type { SycoAppState } from '../types/index'
import { getSycoAppState } from './store'

export interface UseSycoUiStateReturn {
  state: SycoAppState
}

export function useSycoUiState(): UseSycoUiStateReturn {
  return { state: getSycoAppState() }
}

export function useDerivedTitle(): ComputedRef<string> {
  const state = getSycoAppState()
  return computed(() => {
    if (state.title && state.artist) return `${state.artist} — ${state.title}`
    if (state.title) return state.title
    if (state.artist) return state.artist
    return 'NO METADATA'
  })
}
