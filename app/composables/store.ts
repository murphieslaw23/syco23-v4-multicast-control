import { reactive } from 'vue'
import type { SycoAppState, DestinationState } from '../types/index'
import { detectLayout } from './layout'

const state = reactive<SycoAppState>({
  live: false,
  sessionId: null,
  uptime: null,
  streamStatus: 'offline',
  sourceUrl: null,
  ingestStatus: 'idle',
  title: '',
  artist: '',
  show: undefined,
  artworkUrl: undefined,
  backgroundUrl: undefined,
  listeners: undefined,
  bitrate: undefined,
  codec: undefined,
  destinations: [],
  pipelineHealth: 'ok',
  uiMode: detectLayout().mode,
  collapsedNav: false,
})

export function getSycoAppState(): SycoAppState {
  return state
}

export function getLocalDestination(): DestinationState | undefined {
  return state.destinations.find((d) => d.provider === 'local' && d.status === 'live')
}

export function updateSycoAppState(patch: Partial<SycoAppState>) {
  Object.assign(state, patch)
}

export function setSycoAppState(next: SycoAppState) {
  Object.assign(state, next)
}
