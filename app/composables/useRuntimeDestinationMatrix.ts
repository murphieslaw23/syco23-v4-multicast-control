import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { DestinationState, DestinationStatus } from '../contracts/domain'
import { getSycoAppState, updateSycoAppState } from './store'
import { runtimeApi } from '../services/runtime-api'

export interface DestinationMatrixApi {
  destinations(): Promise<DestinationState[]>
  createDestination(input: DestinationState): Promise<DestinationState>
  updateDestination(id: string, patch: Partial<DestinationState>, version?: number): Promise<DestinationState>
  deleteDestination(id: string, version?: number): Promise<void>
}

export interface UseRuntimeDestinationMatrixReturn {
  destinations: ComputedRef<DestinationState[]>
  loading: Ref<boolean>
  error: Ref<string>
  load(): Promise<void>
  add(destination: DestinationState): Promise<void>
  remove(id: string): Promise<void>
  updateStatus(id: string, status: DestinationStatus): Promise<void>
}

export function useRuntimeDestinationMatrix(
  api: DestinationMatrixApi = runtimeApi,
): UseRuntimeDestinationMatrixReturn {
  const state = getSycoAppState()
  const loading = ref(false)
  const error = ref('')
  const destinations = computed(() => state.destinations)

  function replace(items: DestinationState[]): void {
    updateSycoAppState({ destinations: items })
  }

  function replaceOne(item: DestinationState): void {
    replace(state.destinations.map(current => current.id === item.id ? item : current))
  }

  async function execute(operation: () => Promise<void>): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      await operation()
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function load(): Promise<void> {
    await execute(async () => replace(await api.destinations()))
  }

  async function add(destination: DestinationState): Promise<void> {
    await execute(async () => {
      const created = await api.createDestination(destination)
      replace([...state.destinations.filter(item => item.id !== created.id), created])
    })
  }

  async function remove(id: string): Promise<void> {
    const current = state.destinations.find(item => item.id === id)
    if (!current) return
    await execute(async () => {
      await api.deleteDestination(id, current.version)
      replace(state.destinations.filter(item => item.id !== id))
    })
  }

  async function updateStatus(id: string, status: DestinationStatus): Promise<void> {
    const current = state.destinations.find(item => item.id === id)
    if (!current) return
    await execute(async () => {
      replaceOne(await api.updateDestination(id, { status }, current.version))
    })
  }

  return { destinations, loading, error, load, add, remove, updateStatus }
}
