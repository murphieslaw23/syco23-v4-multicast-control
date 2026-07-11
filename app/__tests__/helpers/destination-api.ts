import { getSycoAppState, updateSycoAppState } from '../../composables/store'
import type { DestinationMatrixApi } from '../../composables/useRuntimeDestinationMatrix'
import type { DestinationState } from '../../contracts/domain'

function cloneDestination(destination: DestinationState): DestinationState {
  return JSON.parse(JSON.stringify(destination)) as DestinationState
}

export function createDestinationApi(): DestinationMatrixApi {
  return {
    async destinations() {
      return getSycoAppState().destinations.map(cloneDestination)
    },
    async createDestination(input) {
      const created = { ...input, version: input.version ?? 1 }
      updateSycoAppState({ destinations: [...getSycoAppState().destinations, created] })
      return cloneDestination(created)
    },
    async updateDestination(id, patch, version) {
      const current = getSycoAppState().destinations.find(item => item.id === id)
      if (!current) throw new Error('Destination not found')
      const updated: DestinationState = { ...current, ...patch, version: (version ?? current.version ?? 1) + 1 }
      updateSycoAppState({
        destinations: getSycoAppState().destinations.map(item => item.id === id ? updated : item),
      })
      return cloneDestination(updated)
    },
    async deleteDestination(id) {
      updateSycoAppState({ destinations: getSycoAppState().destinations.filter(item => item.id !== id) })
    },
  }
}
