import { computed, type ComputedRef } from 'vue'
import type { DestinationState, DestinationStatus } from '../types/index'
import { getSycoAppState, updateSycoAppState } from './store'

export interface UseDestinationMatrixReturn {
  destinations: ComputedRef<DestinationState[]>
  addDestination: (dest: DestinationState) => void
  removeDestination: (id: string) => void
  updateDestinationStatus: (id: string, status: DestinationStatus) => void
  getDestination: (id: string) => DestinationState | undefined
}

export function useDestinationMatrix(): UseDestinationMatrixReturn {
  const state = getSycoAppState()

  const destinations = computed(() => state.destinations)

  function addDestination(dest: DestinationState) {
    updateSycoAppState({
      destinations: [...state.destinations, dest],
    })
  }

  function removeDestination(id: string) {
    updateSycoAppState({
      destinations: state.destinations.filter((d) => d.id !== id),
    })
  }

  function updateDestinationStatus(id: string, status: DestinationStatus) {
    updateSycoAppState({
      destinations: state.destinations.map((d) =>
        d.id === id ? { ...d, status } : d,
      ),
    })
  }

  function getDestination(id: string): DestinationState | undefined {
    return state.destinations.find((d) => d.id === id)
  }

  return {
    destinations,
    addDestination,
    removeDestination,
    updateDestinationStatus,
    getDestination,
  }
}
