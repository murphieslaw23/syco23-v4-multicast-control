import type { NowPlaying } from '../composables/useSycoMetadata'

export interface AzuraCastResponse {
  id: string
  name: string | null
  shortcode: string
  description: string
  url: string
  genre: string
  listeners: {
    total: number
    unique: number
    current: number
  } | null
  is_playing: boolean
  now_playing: {
    song: {
      id: string
      text: string
      artist: string | null
      title: string | null
      album: string
      art: string | null
    }
    elapsed: number
    duration: number
  }
  history: Array<{
    song: {
      id: string
      text: string
      artist: string
      title: string
    }
  }>
}

export interface MetadataMiddlewareConfig {
  apiUrl: string
  apiKey: string
  pollIntervalMs: number
}

export function normalizeAzuraCast(raw: AzuraCastResponse): NowPlaying {
  return {
    title: raw.now_playing?.song?.title ?? '',
    artist: raw.now_playing?.song?.artist ?? '',
    show: raw.name ?? null,
    artworkUrl: raw.now_playing?.song?.art ?? null,
    listeners: raw.listeners?.current ?? null,
    bitrate: null,
  }
}

export function createMetadataMiddleware(config: MetadataMiddlewareConfig) {
  let timer: ReturnType<typeof setInterval> | null = null
  let latest: NowPlaying = { title: '', artist: '', show: null, artworkUrl: null, listeners: null, bitrate: null }

  async function poll(): Promise<NowPlaying> {
    try {
      const res = await fetch(`${config.apiUrl}/api/nowplaying`, {
        headers: { 'X-Api-Key': config.apiKey },
      })
      if (!res.ok) return latest
      const data: AzuraCastResponse = await res.json()
      latest = normalizeAzuraCast(data)
      return latest
    } catch {
      return latest
    }
  }

  function start() {
    if (timer) return
    timer = setInterval(() => { poll() }, config.pollIntervalMs)
  }

  function stop() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function getLatest(): NowPlaying {
    return latest
  }

  return { poll, start, stop, getLatest }
}
