import { computed, ref, type ComputedRef } from 'vue'

export interface NowPlaying {
  title: string
  artist: string
  show: string | null
  artworkUrl: string | null
  listeners: number | null
  bitrate: number | null
}

export interface UseSycoMetadataReturn {
  nowPlaying: ComputedRef<NowPlaying>
  isLive: ComputedRef<boolean>
  refresh: () => void
}

export function useSycoMetadata(): UseSycoMetadataReturn {
  const loading = ref(false)

  const state = ref<NowPlaying>({
    title: '',
    artist: '',
    show: null,
    artworkUrl: null,
    listeners: null,
    bitrate: null,
  })

  const nowPlaying = computed(() => state.value)
  const isLive = computed(() => state.value.title.length > 0 || state.value.artist.length > 0)

  function refresh() {
    loading.value = true
    loading.value = false
  }

  return { nowPlaying, isLive, refresh }
}
