import { computed, ref, type ComputedRef } from 'vue'
import type { TransmissionKit } from '../contracts/domain'
import { runtimeApi } from '../services/runtime-api'

const kit = ref<TransmissionKit | null>(null)
const kits = ref<TransmissionKit[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

export interface UseTransmissionKitReturn {
  current: ComputedRef<TransmissionKit | null>
  kits: ComputedRef<TransmissionKit[]>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  load: () => Promise<TransmissionKit[]>
  generate: (input: { destinationId: string; templateId?: string; title?: string; artist?: string; show?: string; publicUrl?: string }) => Promise<TransmissionKit>
  update: (id: string, patch: Partial<Pick<TransmissionKit, 'titleBlock' | 'descriptionBlock' | 'metadata' | 'labels' | 'launchNotes' | 'checklist'>>) => Promise<TransmissionKit>
  remove: (id: string) => Promise<void>
  reset: () => void
}

export function useTransmissionKit(): UseTransmissionKitReturn {
  async function load(): Promise<TransmissionKit[]> {
    loading.value = true; error.value = null
    try {
      const result = await runtimeApi.transmissionKits()
      kits.value = result.items
      return kits.value
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      throw cause
    } finally { loading.value = false }
  }

  async function generate(input: { destinationId: string; templateId?: string; title?: string; artist?: string; show?: string; publicUrl?: string }): Promise<TransmissionKit> {
    loading.value = true; error.value = null
    try {
      const created = await runtimeApi.generateTransmissionKit(input)
      kit.value = created
      kits.value = [created, ...kits.value.filter((item) => item.id !== created.id)]
      return created
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      throw cause
    } finally { loading.value = false }
  }

  async function update(id: string, patch: Partial<Pick<TransmissionKit, 'titleBlock' | 'descriptionBlock' | 'metadata' | 'labels' | 'launchNotes' | 'checklist'>>): Promise<TransmissionKit> {
    const current = kits.value.find((item) => item.id === id)
    const updated = await runtimeApi.updateTransmissionKit(id, patch, current?.version)
    const index = kits.value.findIndex((item) => item.id === id)
    if (index >= 0) kits.value[index] = updated
    if (kit.value?.id === id) kit.value = updated
    return updated
  }

  async function remove(id: string): Promise<void> {
    const current = kits.value.find((item) => item.id === id)
    await runtimeApi.deleteTransmissionKit(id, current?.version)
    kits.value = kits.value.filter((item) => item.id !== id)
    if (kit.value?.id === id) kit.value = null
  }

  function reset(): void { kit.value = null }

  return {
    current: computed(() => kit.value), kits: computed(() => kits.value), loading: computed(() => loading.value), error: computed(() => error.value),
    load, generate, update, remove, reset,
  }
}
