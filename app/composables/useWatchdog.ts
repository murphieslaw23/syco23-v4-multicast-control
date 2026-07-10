import { computed, ref, type ComputedRef } from 'vue'
import { getSycoAppState } from './store'

export interface WatchdogEvent {
  id: string
  timestamp: string
  source: string
  message: string
  severity: 'info' | 'warning' | 'error'
}

export interface UseWatchdogReturn {
  isHealthy: ComputedRef<boolean>
  events: ComputedRef<WatchdogEvent[]>
  reportEvent: (event: Omit<WatchdogEvent, 'id' | 'timestamp'>) => void
  clearEvents: () => void
}

export function useWatchdog(): UseWatchdogReturn {
  const state = getSycoAppState()
  const eventList = ref<WatchdogEvent[]>([])

  const isHealthy = computed(() => state.pipelineHealth === 'ok')
  const events = computed(() => eventList.value)

  function reportEvent(event: Omit<WatchdogEvent, 'id' | 'timestamp'>) {
    const entry: WatchdogEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    eventList.value = [...eventList.value, entry]
  }

  function clearEvents() {
    eventList.value = []
  }

  return { isHealthy, events, reportEvent, clearEvents }
}
