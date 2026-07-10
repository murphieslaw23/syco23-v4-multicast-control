import { ref, computed, type ComputedRef } from 'vue'
import { getSycoAppState } from './store'
import type { PipelineHealth } from '../types/index'

export interface WatchdogThresholds {
  stallSeconds: number
  reconnectAttempts: number
  degradedFps: number
}

export interface WatchdogStatus {
  monitored: boolean
  checksCount: number
  lastCheckAt: string | null
  recoveryActions: number
}

export interface UseWatchdogServiceReturn {
  status: ComputedRef<WatchdogStatus>
  thresholds: WatchdogThresholds
  isMonitored: ComputedRef<boolean>
  startMonitoring: () => void
  stopMonitoring: () => void
  runCheck: (currentFps: number, isStalled: boolean) => void
  triggerRecovery: (reason: string) => void
}

const DEFAULT_THRESHOLDS: WatchdogThresholds = {
  stallSeconds: 15,
  reconnectAttempts: 3,
  degradedFps: 10,
}

export function useWatchdogService(): UseWatchdogServiceReturn {
  const state = getSycoAppState()
  const currentStatus = ref<WatchdogStatus>({
    monitored: false,
    checksCount: 0,
    lastCheckAt: null,
    recoveryActions: 0,
  })

  const status = computed(() => currentStatus.value)
  const isMonitored = computed(() => currentStatus.value.monitored)

  function startMonitoring() {
    currentStatus.value = { ...currentStatus.value, monitored: true }
  }

  function stopMonitoring() {
    currentStatus.value = { ...currentStatus.value, monitored: false }
  }

  function runCheck(currentFps: number, isStalled: boolean) {
    currentStatus.value = {
      ...currentStatus.value,
      checksCount: currentStatus.value.checksCount + 1,
      lastCheckAt: new Date().toISOString(),
    }

    if (isStalled) {
      triggerRecovery('stream_stalled')
      return
    }

    if (currentFps < DEFAULT_THRESHOLDS.degradedFps) {
      triggerRecovery('low_fps')
    }
  }

  function triggerRecovery(_reason: string) {
    currentStatus.value = {
      ...currentStatus.value,
      recoveryActions: currentStatus.value.recoveryActions + 1,
    }
  }

  return {
    status,
    thresholds: DEFAULT_THRESHOLDS,
    isMonitored,
    startMonitoring,
    stopMonitoring,
    runCheck,
    triggerRecovery,
  }
}
