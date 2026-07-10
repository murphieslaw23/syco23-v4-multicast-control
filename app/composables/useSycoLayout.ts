import { ref, onMounted, onUnmounted, watch, type Ref } from 'vue'
import { detectLayout, watchLayout } from './layout'
import type { LayoutState, UiMode } from '../types/index'

export interface UseSycoLayoutReturn {
  mode: Ref<UiMode>
}

export function useSycoLayout(): UseSycoLayoutReturn {
  const mode = ref<UiMode>(detectLayout().mode)

  function applyMode(value: UiMode) {
    if (typeof document !== 'undefined') {
      document.documentElement.dataset.mode = value
    }
  }

  applyMode(mode.value)

  watch(mode, (next) => applyMode(next))

  onMounted(() => {
    const cleanup = watchLayout(
      (state: LayoutState) => ({ mode: state.mode }),
      (state: LayoutState) => {
        mode.value = state.mode
      },
    )
    onUnmounted(() => {
      cleanup()
    })
  })

  return { mode }
}
