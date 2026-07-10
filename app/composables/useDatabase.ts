import { ref, readonly, onMounted, onUnmounted, type Ref } from 'vue'
import { getDatabase, type Database } from '../server/database'

export interface UseDatabaseReturn {
  ready: Readonly<Ref<boolean>>
  error: Readonly<Ref<string | null>>
  database: Database
}

let initialized = false

export function useDatabase(): UseDatabaseReturn {
  const ready = ref(false)
  const error = ref<string | null>(null)
  const database = getDatabase()

  onMounted(async () => {
    if (initialized) {
      ready.value = database.isReady()
      return
    }

    try {
      await database.initialize()
      ready.value = true
      initialized = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize database'
      ready.value = false
    }
  })

  onUnmounted(() => {
    // Keep database alive across component unmounts
    // Only close on full app teardown if needed
  })

  return {
    ready: readonly(ready),
    error: readonly(error),
    database,
  }
}
