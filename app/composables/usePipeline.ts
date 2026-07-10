import { ref, computed, type ComputedRef } from 'vue'
import type { PipelineHealth, DestinationState } from '../types/index'
import { getSycoAppState, updateSycoAppState } from '../composables/store'
import { runtimeApi } from '../services/runtime-api'

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
  lastError?: string | null
}

export interface UsePipelineReturn {
  status: ComputedRef<PipelineStatus>
  health: ComputedRef<PipelineHealth>
  isRunning: ComputedRef<boolean>
  start: (config: PipelineConfig) => Promise<void>
  stop: () => Promise<void>
  restart: () => Promise<void>
  refresh: () => Promise<void>
  reportHealth: (health: PipelineHealth) => void
}

export function usePipeline(): UsePipelineReturn {
  const state = getSycoAppState()
  let lastConfig: PipelineConfig | null = null
  const currentStatus = ref<PipelineStatus>({ state: 'idle', fps: 0, bitrate: 0, codec: 'h264', uptime: 0, lastError: null })
  const status = computed(() => currentStatus.value)
  const health = computed(() => state.pipelineHealth)
  const isRunning = computed(() => currentStatus.value.state === 'running')

  async function refresh() {
    const runtime = await runtimeApi.status()
    const supervisorState = runtime.supervisor.state
    currentStatus.value = {
      state: supervisorState === 'preparing' ? 'starting' : supervisorState,
      fps: runtime.supervisor.metrics.fps,
      bitrate: runtime.supervisor.metrics.bitrateKbps,
      codec: 'h264',
      uptime: runtime.supervisor.metrics.outTimeMs / 1000,
      lastError: runtime.supervisor.lastError,
    }
    updateSycoAppState({ live: runtime.live, pipelineHealth: runtime.pipelineHealth, ingestStatus: runtime.ingestStatus })
  }

  async function start(config: PipelineConfig) {
    if (!config.sourceUrl.trim()) throw new Error('Source URL is required')
    if (!config.destinations.length) throw new Error('At least one destination is required')
    lastConfig = structuredClone(config)
    currentStatus.value = { ...currentStatus.value, state: 'starting', lastError: null }
    try {
      await runtimeApi.startPipeline(config)
      await refresh()
    } catch (error) {
      currentStatus.value = { ...currentStatus.value, state: 'failed', lastError: error instanceof Error ? error.message : String(error) }
      updateSycoAppState({ pipelineHealth: 'failed' })
      throw error
    }
  }

  async function stop() {
    currentStatus.value = { ...currentStatus.value, state: 'stopping' }
    await runtimeApi.stopPipeline()
    await refresh()
  }

  async function restart() {
    const config = lastConfig ?? { sourceUrl: state.sourceUrl ?? '', destinations: state.destinations, videoProfile: '1080p', audioProfile: '128k' }
    await stop()
    await start(config)
  }

  function reportHealth(value: PipelineHealth) { updateSycoAppState({ pipelineHealth: value }) }
  return { status, health, isRunning, start, stop, restart, refresh, reportHealth }
}
