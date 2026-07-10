import { computed, ref, type ComputedRef } from 'vue'
import type { TransmissionKit, Provider } from '../types/index'
import { useDestinationMatrix } from './useDestinationMatrix'

export interface UseTransmissionKitReturn {
  current: ComputedRef<TransmissionKit | null>
  generate: (destinationId: string, provider: Provider) => TransmissionKit
  reset: () => void
}

export function useTransmissionKit(): UseTransmissionKitReturn {
  const kit = ref<TransmissionKit | null>(null)
  const current = computed(() => kit.value)

  function generate(destinationId: string, provider: Provider): TransmissionKit {
    kit.value = {
      id: crypto.randomUUID(),
      destinationId,
      titleBlock: `[${provider.toUpperCase()}] Show Title`,
      descriptionBlock: 'Generated for transmission.',
      metadata: { provider, generatedAt: new Date().toISOString() },
      labels: [provider, 'live'],
      launchNotes: 'Review endpoint and key before arming.',
    }
    return kit.value
  }

  function reset() {
    kit.value = null
  }

  return { current, generate, reset }
}
