import { ref, computed, type ComputedRef } from 'vue'
import type { PipelineHealth, DestinationState } from '../types/index'
import { getSycoAppState, updateSycoAppState } from '../composables/store'

export interface PipelineConfig {
  sourceUrl: string
  destinations: DestinationState[]
  videoProfile: string
  audioProfile: string
}

export interface PipelineStatus {
  state: 'idle' | 'starting' | 'running' | 'stopping' | 'failed'
  fps: number
  bitrate: number
  codec: string
  uptime: number
}

export interface UsePipelineReturn {
  status: ComputedRef<PipelineStatus>
  health: ComputedRef<PipelineHealth>
  isRunning: ComputedRef<boolean>
  start: (config: PipelineConfig) => Promise<void>
  stop: () => Promise<void>
  restart: () => Promise<void>
  reportHealth: (health: PipelineHealth) => void
}

export function usePipeline(): UsePipelineReturn {
  const state = getSycoAppState()

  const currentStatus = ref<PipelineStatus>({
    state: 'idle',
    fps: 0,
    bitrate: 0,
    codec: 'h264',
    uptime: 0,
  })

  const status = computed(() => currentStatus.value)
  const health = computed(() => state.pipelineHealth)
  const isRunning = computed(() => currentStatus.value.state === 'running')

  async function start(_config: PipelineConfig) {
    currentStatus.value = { ...currentStatus.value, state: 'starting' }
    currentStatus.value = {
      state: 'running',
      fps: 30,
      bitrate: 4500,
      codec: 'h264',
      uptime: 0,
    }
    updateSycoAppState({ pipelineHealth: 'ok' })
  }

  async function stop() {
    currentStatus.value = { ...currentStatus.value, state: 'stopping' }
    currentStatus.value = { ...currentStatus.value, state: 'idle', fps: 0, bitrate: 0 }
  }

  async function restart() {
    await stop()
    await start({ sourceUrl: state.sourceUrl ?? '', destinations: state.destinations, videoProfile: '1080p', audioProfile: '128k' })
  }

  function reportHealth(h: PipelineHealth) {
    updateSycoAppState({ pipelineHealth: h })
  }

  return { status, health, isRunning, start, stop, restart, reportHealth }
}
