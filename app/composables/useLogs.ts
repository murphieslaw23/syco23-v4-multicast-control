import { computed, ref, type ComputedRef } from 'vue'
import type { LogEntry } from '../types/index'

export interface UseLogsReturn {
  entries: ComputedRef<LogEntry[]>
  append: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void
  filterByLevel: (level: LogEntry['level']) => LogEntry[]
  clear: () => void
}

export function useLogs(): UseLogsReturn {
  const entryList = ref<LogEntry[]>([])

  const entries = computed(() => entryList.value)

  function append(entry: Omit<LogEntry, 'id' | 'timestamp'>) {
    entryList.value = [
      ...entryList.value,
      { ...entry, id: crypto.randomUUID(), timestamp: new Date().toISOString() },
    ]
  }

  function filterByLevel(level: LogEntry['level']): LogEntry[] {
    return entryList.value.filter((e) => e.level === level)
  }

  function clear() {
    entryList.value = []
  }

  return { entries, append, filterByLevel, clear }
}
