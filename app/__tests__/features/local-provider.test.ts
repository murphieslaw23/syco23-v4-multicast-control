import { describe, it, expect, beforeEach } from 'vitest'
import { updateSycoAppState, getSycoAppState, getLocalDestination } from '../../composables/store'
import type { DestinationState } from '../../types/index'

const makeDestination = (overrides: Partial<DestinationState> = {}): DestinationState => ({
  id: 'dest-1',
  provider: 'youtube',
  label: 'YouTube Main',
  protocol: 'rtmps',
  endpointUrl: 'rtmp://a.rtmp.youtube.com/live2',
  streamKeyRef: 'ref-1',
  status: 'idle',
  health: null,
  lastHandshakeAt: null,
  lastError: null,
  videoProfile: '1080p',
  audioProfile: '128k',
  monitorMode: 'rtmp-output',
  requiresManualPlatformSetup: false,
  capabilities: [],
  transmissionKitId: null,
  notes: '',
  ...overrides,
})

describe('store/getLocalDestination', () => {
  beforeEach(() => {
    updateSycoAppState({
      live: false,
      sessionId: null,
      uptime: null,
      streamStatus: 'offline',
      sourceUrl: null,
      ingestStatus: 'idle',
      title: '',
      artist: '',
      destinations: [],
      pipelineHealth: 'ok',
      uiMode: 'landscape',
      collapsedNav: false,
    })
  })

  it('returns undefined when no destinations exist', () => {
    expect(getLocalDestination()).toBeUndefined()
  })

  it('returns undefined when only non-local destinations exist', () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'a', provider: 'youtube', status: 'live' }),
        makeDestination({ id: 'b', provider: 'telegram', status: 'configured' }),
      ],
    })
    expect(getLocalDestination()).toBeUndefined()
  })

  it('returns undefined when local destination is not live', () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'a', provider: 'local', status: 'configured' }),
      ],
    })
    expect(getLocalDestination()).toBeUndefined()
  })

  it('returns the local destination when it is live', () => {
    const local = makeDestination({ id: 'local-1', provider: 'local', label: 'Self Cast', status: 'live' })
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'a', provider: 'youtube', status: 'idle' }),
        local,
      ],
    })
    const result = getLocalDestination()
    expect(result).toBeDefined()
    expect(result?.id).toBe('local-1')
    expect(result?.provider).toBe('local')
    expect(result?.status).toBe('live')
  })

  it('returns the first live local destination when multiple exist', () => {
    const local1 = makeDestination({ id: 'local-1', provider: 'local', label: 'Cam 1', status: 'live' })
    const local2 = makeDestination({ id: 'local-2', provider: 'local', label: 'Cam 2', status: 'live' })
    updateSycoAppState({ destinations: [local1, local2] })
    const result = getLocalDestination()
    expect(result?.id).toBe('local-1')
  })

  it('returns undefined when local destination is in error state', () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', status: 'failed' }),
      ],
    })
    expect(getLocalDestination()).toBeUndefined()
  })

  it('returns undefined when local destination is in idle state', () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', status: 'idle' }),
      ],
    })
    expect(getLocalDestination()).toBeUndefined()
  })

  it('reacts reactively to status changes', () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', status: 'configured' }),
      ],
    })
    expect(getLocalDestination()).toBeUndefined()

    // Cycle to live
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', status: 'live' }),
      ],
    })
    expect(getLocalDestination()).toBeDefined()
    expect(getLocalDestination()?.status).toBe('live')
  })
})

describe('types — Provider union includes local', () => {
  it('local is a valid Provider type at runtime', () => {
    const state = getSycoAppState()
    const localDest = makeDestination({ provider: 'local' })
    updateSycoAppState({ destinations: [localDest] })
    expect(state.destinations[0].provider).toBe('local')
  })

  it('all 10 providers are valid in the type system', () => {
    const providers: DestinationState['provider'][] = [
      'youtube', 'telegram', 'tiktok', 'twitch', 'instagram',
      'mixer', 'mixcloud', 'facebook', 'custom-rtmp', 'local',
    ]
    expect(providers).toHaveLength(10)
    expect(providers).toContain('local')
  })
})
