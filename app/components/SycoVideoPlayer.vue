<script setup lang="ts">
import type HlsType from 'hls.js'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { getLocalDestination, getSycoAppState } from '../composables/store'
import { runtimeApi, type PreviewStatus } from '../services/runtime-api'

const appState = getSycoAppState()
const localDest = computed(() => getLocalDestination())
const video = ref<HTMLVideoElement | null>(null)
const status = ref<PreviewStatus>({
  state: 'idle',
  pid: null,
  startedAt: null,
  lastSegmentAt: null,
  playlistReady: false,
  segmentCount: 0,
  lastError: null,
})
const loading = ref(false)
const error = ref<string | null>(null)
const playing = ref(false)
const muted = ref(true)
const volume = ref(0.8)
let hls: HlsType | null = null
let pollTimer: ReturnType<typeof setInterval> | null = null
let ticketExpiresAt = 0
let playlistUrl = ''

const isSelfCasting = computed(() => !!localDest.value)
const runtimeOnline = computed(() => status.value.state === 'running' && status.value.playlistReady)
const legacyOnline = computed(() => appState.live && appState.ingestStatus === 'connected')
const online = computed(() => runtimeOnline.value || legacyOnline.value || isSelfCasting.value)
const stateLabel = computed(() => {
  if (error.value) return 'PREVIEW ERROR'
  if (loading.value || status.value.state === 'starting') return 'BUFFERING'
  if (isSelfCasting.value) return 'SELF CAST'
  if (online.value) return playing.value ? 'LIVE PREVIEW' : 'LIVE PREVIEW'
  if (status.value.state === 'failed') return 'PREVIEW FAILED'
  return isSelfCasting.value ? 'SELF CAST' : 'NO SIGNAL'
})

async function refreshStatus(): Promise<void> {
  try {
    const nextStatus = await runtimeApi.previewStatus()
    // Treat an empty/malformed response as a failed refresh. This keeps the
    // last known-good snapshot intact during logout, teardown, and transient
    // runtime failures instead of breaking every computed/watch subscriber.
    if (!nextStatus || typeof nextStatus !== 'object') {
      throw new Error('Preview status response is invalid')
    }
    status.value = nextStatus
    if (nextStatus.playlistReady && !playlistUrl) await attachPreview()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : String(cause)
  }
}

async function getPlaylistUrl(): Promise<string> {
  if (!playlistUrl || ticketExpiresAt - Date.now() < 30_000) {
    const issued = await runtimeApi.previewTicket()
    ticketExpiresAt = Date.parse(issued.expiresAt)
    playlistUrl = `/api/preview/index.m3u8?ticket=${encodeURIComponent(issued.ticket)}`
  }
  return playlistUrl
}

async function attachPreview(): Promise<void> {
  if (!video.value || !status.value.playlistReady) return
  loading.value = true
  error.value = null
  const url = await getPlaylistUrl()
  hls?.destroy()
  hls = null

  const { default: Hls } = await import('hls.js')
  if (Hls.isSupported()) {
    hls = new Hls({
      liveSyncDurationCount: 2,
      liveMaxLatencyDurationCount: 5,
      enableWorker: true,
      lowLatencyMode: true,
    })
    hls.loadSource(url)
    hls.attachMedia(video.value)
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      loading.value = false
      void video.value?.play().catch(() => undefined)
    })
    hls.on(Hls.Events.ERROR, (_event, data) => {
      if (!data.fatal) return
      error.value = data.details || 'HLS playback failed'
      loading.value = false
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        playlistUrl = ''
        hls?.startLoad()
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        hls?.recoverMediaError()
      } else {
        hls?.destroy()
        hls = null
      }
    })
  } else if (video.value.canPlayType('application/vnd.apple.mpegurl')) {
    video.value.src = url
    video.value.addEventListener('loadedmetadata', () => {
      loading.value = false
      void video.value?.play().catch(() => undefined)
    }, { once: true })
  } else {
    error.value = 'This browser does not support HLS playback'
    loading.value = false
  }
}

async function togglePlay(): Promise<void> {
  const element = video.value
  if (!element) return
  if (!online.value) {
    await refreshStatus()
    if (status.value.playlistReady) await attachPreview()
    return
  }
  if (element.paused) await element.play()
  else element.pause()
}

function toggleMute(): void {
  muted.value = !muted.value
  if (video.value) video.value.muted = muted.value
}

function setVolume(event: Event): void {
  const value = Number((event.target as HTMLInputElement).value)
  volume.value = Math.max(0, Math.min(1, value))
  if (video.value) video.value.volume = volume.value
}

watch(() => status.value.playlistReady, async (ready) => {
  if (ready && !hls && !video.value?.src) {
    await nextTick()
    await attachPreview()
  }
})

onMounted(() => {
  void refreshStatus()
  pollTimer = setInterval(() => void refreshStatus(), 3000)
})

onBeforeUnmount(() => {
  if (pollTimer) clearInterval(pollTimer)
  hls?.destroy()
})
</script>

<template>
  <section class="syco-player" :class="{ 'syco-player--active': online }" aria-label="Live HLS preview">
    <div class="syco-player-display">
      <video
        ref="video"
        class="syco-player-video"
        playsinline
        :muted="muted"
        preload="metadata"
        @play="playing = true"
        @pause="playing = false"
        @waiting="loading = true"
        @playing="loading = false"
      />
      <div v-if="!runtimeOnline || error" class="syco-player-overlay" role="status" aria-live="polite">
        <span :class="online ? 'syco-player-indicator' : 'syco-player-signal'">{{ stateLabel }}</span>
        <span v-if="isSelfCasting" class="syco-player-dest">{{ localDest?.label }}</span>
        <span v-if="error" class="syco-player-error">{{ error }}</span>
      </div>
      <div v-else class="syco-player-badge">
        <span>{{ stateLabel }}</span>
        <span>{{ status.segmentCount }} SEG</span>
      </div>
    </div>
    <div class="syco-player-controls">
      <button class="syco-player-btn" type="button" :disabled="loading" @click="togglePlay">
        {{ playing ? 'PAUSE' : 'PLAY' }}
      </button>
      <button class="syco-player-btn syco-player-btn--compact" type="button" @click="toggleMute">
        {{ muted ? 'UNMUTE' : 'MUTE' }}
      </button>
      <label class="syco-player-volume">
        <span>VOL</span>
        <input min="0" max="1" step="0.05" type="range" :value="volume" @input="setVolume">
      </label>
    </div>
  </section>
</template>

<style scoped>
.syco-player { border: 1px solid var(--syco-border); background: var(--syco-surface-1); overflow: hidden; }
.syco-player-display { position: relative; aspect-ratio: 16 / 9; display: grid; place-items: center; background: var(--syco-surface-0); }
.syco-player-video { width: 100%; height: 100%; object-fit: contain; background: #000; }
.syco-player-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: var(--syco-space-2); background: linear-gradient(135deg, rgba(0,0,0,.9), rgba(25,25,25,.92)); padding: var(--syco-space-4); text-align: center; }
.syco-player-signal, .syco-player-indicator, .syco-player-badge, .syco-player-dest, .syco-player-error, .syco-player-volume { font-family: var(--syco-font-mono); letter-spacing: .1em; }
.syco-player-signal { font-size: .75rem; color: var(--syco-text-muted); }
.syco-player-indicator { font-size: .75rem; color: var(--syco-live); }
.syco-player-dest { font-size: .625rem; color: var(--syco-text-muted); }
.syco-player-error { max-width: 48ch; font-size: .6875rem; color: var(--syco-danger); letter-spacing: .02em; }
.syco-player-badge { position: absolute; top: var(--syco-space-2); left: var(--syco-space-2); right: var(--syco-space-2); display: flex; justify-content: space-between; font-size: .625rem; color: var(--syco-live); pointer-events: none; }
.syco-player-controls { display: grid; grid-template-columns: minmax(7rem, 1fr) auto minmax(8rem, 1fr); gap: var(--syco-space-2); align-items: center; padding: var(--syco-space-2); border-top: 1px solid var(--syco-border); }
.syco-player-btn { min-height: 44px; background: var(--syco-surface-3); border: 1px solid var(--syco-border); color: var(--syco-text); font-family: var(--syco-font-mono); font-size: .75rem; padding: var(--syco-space-2); cursor: pointer; }
.syco-player-btn:disabled { cursor: wait; opacity: .55; }
.syco-player-btn--compact { min-width: 6rem; }
.syco-player-volume { display: grid; grid-template-columns: auto 1fr; gap: var(--syco-space-2); align-items: center; font-size: .625rem; color: var(--syco-text-muted); }
.syco-player-volume input { width: 100%; }
@media (max-width: 560px) { .syco-player-controls { grid-template-columns: 1fr 1fr; } .syco-player-volume { grid-column: 1 / -1; } }
</style>
