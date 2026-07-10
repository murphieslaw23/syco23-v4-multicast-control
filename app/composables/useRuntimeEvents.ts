import { onMounted, onUnmounted, ref, type Ref } from 'vue'
import { connectRuntimeEvents } from '../services/runtime-api'

export interface RuntimeTelemetry {
  connected: boolean
  lastEventAt: string | null
  fps: number
  bitrate: number
  outTimeMs: number
  lastError: string | null
}

export function useRuntimeEvents(): Ref<RuntimeTelemetry> {
  const telemetry = ref<RuntimeTelemetry>({ connected: false, lastEventAt: null, fps: 0, bitrate: 0, outTimeMs: 0, lastError: null })
  let disconnect: (() => void) | null = null
  onMounted(() => {
    disconnect = connectRuntimeEvents((event) => {
      telemetry.value.connected = true
      telemetry.value.lastEventAt = event.timestamp
      if (event.type === 'pipeline.metrics') {
        const metrics = event.payload as { fps?: number; bitrateKbps?: number; outTimeMs?: number }
        telemetry.value.fps = metrics.fps || 0
        telemetry.value.bitrate = metrics.bitrateKbps || 0
        telemetry.value.outTimeMs = metrics.outTimeMs || 0
      }
      if (event.type === 'pipeline.failed') telemetry.value.lastError = String((event.payload as { error?: string }).error || 'Pipeline failed')
      if (event.type === 'runtime.snapshot') telemetry.value.connected = true
    })
  })
  onUnmounted(() => disconnect?.())
  return telemetry
}
