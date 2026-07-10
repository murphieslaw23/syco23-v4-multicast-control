import { computed, ref, type ComputedRef, type Ref } from 'vue'
import type { OutputProfile } from '../contracts/domain'
import { runtimeApi } from '../services/runtime-api'

export interface UseOutputProfilesReturn {
  profiles: ComputedRef<OutputProfile[]>
  loading: Ref<boolean>
  error: Ref<string>
  loadProfiles: () => Promise<OutputProfile[]>
  createProfile: (profile: OutputProfile) => Promise<OutputProfile>
  updateProfile: (id: string, patch: Partial<OutputProfile>, version?: number) => Promise<OutputProfile>
  deleteProfile: (id: string) => Promise<void>
  addProfile: (profile: OutputProfile) => void
  removeProfile: (id: string) => void
  getProfile: (id: string) => OutputProfile | undefined
}

export function useOutputProfiles(): UseOutputProfilesReturn {
  const localProfiles = ref<OutputProfile[]>([])
  const loading = ref(false)
  const error = ref('')
  const profiles = computed(() => localProfiles.value)

  function addProfile(profile: OutputProfile) {
    const index = localProfiles.value.findIndex((item) => item.id === profile.id)
    if (index >= 0) localProfiles.value.splice(index, 1, profile)
    else localProfiles.value = [...localProfiles.value, profile]
  }

  function removeProfile(id: string) {
    localProfiles.value = localProfiles.value.filter((profile) => profile.id !== id)
  }

  function getProfile(id: string): OutputProfile | undefined {
    return localProfiles.value.find((profile) => profile.id === id)
  }

  async function loadProfiles(): Promise<OutputProfile[]> {
    loading.value = true
    error.value = ''
    try {
      localProfiles.value = await runtimeApi.profiles()
      return localProfiles.value
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      throw cause
    } finally {
      loading.value = false
    }
  }

  async function createProfile(profile: OutputProfile): Promise<OutputProfile> {
    const created = await runtimeApi.createProfile(profile)
    addProfile(created)
    return created
  }

  async function updateProfile(id: string, patch: Partial<OutputProfile>, version?: number): Promise<OutputProfile> {
    const updated = await runtimeApi.updateProfile(id, patch, version)
    addProfile(updated)
    return updated
  }

  async function deleteProfile(id: string): Promise<void> {
    await runtimeApi.deleteProfile(id)
    removeProfile(id)
  }

  return { profiles, loading, error, loadProfiles, createProfile, updateProfile, deleteProfile, addProfile, removeProfile, getProfile }
}
