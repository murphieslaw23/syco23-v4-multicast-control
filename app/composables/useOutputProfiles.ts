import { computed, ref, type ComputedRef } from 'vue'
import type { OutputProfile } from '../types/index'

export interface UseOutputProfilesReturn {
  profiles: ComputedRef<OutputProfile[]>
  addProfile: (profile: OutputProfile) => void
  removeProfile: (id: string) => void
  getProfile: (id: string) => OutputProfile | undefined
}

export function useOutputProfiles(): UseOutputProfilesReturn {
  const localProfiles = ref<OutputProfile[]>([])

  const profiles = computed(() => localProfiles.value)

  function addProfile(profile: OutputProfile) {
    localProfiles.value = [...localProfiles.value, profile]
  }

  function removeProfile(id: string) {
    localProfiles.value = localProfiles.value.filter((p) => p.id !== id)
  }

  function getProfile(id: string): OutputProfile | undefined {
    return localProfiles.value.find((p) => p.id === id)
  }

  return {
    profiles,
    addProfile,
    removeProfile,
    getProfile,
  }
}
