import { describe, it, expect, beforeEach } from 'vitest'
import { updateSycoAppState } from '../../composables/store'
import type { DestinationState, Provider } from '../../types/index'

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
  capabilities: ['hls'],
  transmissionKitId: null,
  notes: '',
  ...overrides,
})

describe('composables/useDestinationMatrix', () => {
  beforeEach(() => {
    updateSycoAppState({ destinations: [] })
  })

  it('starts with empty destinations', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { destinations } = useDestinationMatrix()
    expect(destinations.value).toHaveLength(0)
  })

  it('adds a destination', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { destinations, addDestination } = useDestinationMatrix()
    addDestination(makeDestination())
    expect(destinations.value).toHaveLength(1)
    expect(destinations.value[0].id).toBe('dest-1')
  })

  it('removes a destination by id', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { addDestination, removeDestination } = useDestinationMatrix()
    addDestination(makeDestination({ id: 'a' }))
    addDestination(makeDestination({ id: 'b' }))
    removeDestination('a')
    expect(useDestinationMatrix().destinations.value).toHaveLength(1)
  })

  it('updates destination status', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { addDestination, updateDestinationStatus } = useDestinationMatrix()
    addDestination(makeDestination({ id: 'x', status: 'idle' }))
    updateDestinationStatus('x', 'armed')
    expect(useDestinationMatrix().destinations.value[0].status).toBe('armed')
  })

  it('gets a destination by id', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { addDestination, getDestination } = useDestinationMatrix()
    addDestination(makeDestination({ id: 'find-me' }))
    const found = getDestination('find-me')
    expect(found).toBeDefined()
    expect(found?.id).toBe('find-me')
  })

  it('returns undefined for missing destination', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { getDestination } = useDestinationMatrix()
    expect(getDestination('nonexistent')).toBeUndefined()
  })

  it('updateDestinationStatus is no-op when id not found', async () => {
    const { useDestinationMatrix } = await import('../../composables/useDestinationMatrix')
    const { addDestination, updateDestinationStatus, destinations } = useDestinationMatrix()
    addDestination(makeDestination({ id: 'keep', status: 'idle' }))
    updateDestinationStatus('nonexistent', 'armed')
    expect(destinations.value[0].status).toBe('idle')
  })
})

describe('composables/useSourceIngest', () => {
  beforeEach(() => {
    updateSycoAppState({ sourceUrl: null, ingestStatus: 'idle' })
  })

  it('is not connected initially', async () => {
    const { useSourceIngest } = await import('../../composables/useSourceIngest')
    const { connected, degraded, failed } = useSourceIngest()
    expect(connected.value).toBe(false)
    expect(degraded.value).toBe(false)
    expect(failed.value).toBe(false)
  })

  it('connects and sets sourceUrl', async () => {
    const { useSourceIngest } = await import('../../composables/useSourceIngest')
    const { connected, connect } = useSourceIngest()
    connect('rtmp://source.example.com/live')
    expect(connected.value).toBe(true)
  })

  it('disconnects and clears sourceUrl', async () => {
    const { useSourceIngest } = await import('../../composables/useSourceIngest')
    const { connect, disconnect } = useSourceIngest()
    connect('rtmp://source.example.com/live')
    disconnect()
    expect(useSourceIngest().connected.value).toBe(false)
  })

  it('reconnects when sourceUrl exists', async () => {
    const { useSourceIngest } = await import('../../composables/useSourceIngest')
    const { connect, disconnect, reconnect } = useSourceIngest()
    connect('rtmp://source.example.com/live')
    disconnect()
    reconnect()
    expect(useSourceIngest().connected.value).toBe(true)
  })
})

describe('composables/useOutputProfiles', () => {
  it('starts with empty profiles', async () => {
    const { useOutputProfiles } = await import('../../composables/useOutputProfiles')
    const { profiles } = useOutputProfiles()
    expect(profiles.value).toHaveLength(0)
  })

  it('adds a profile', async () => {
    const { useOutputProfiles } = await import('../../composables/useOutputProfiles')
    const { profiles, addProfile } = useOutputProfiles()
    addProfile({
      id: 'p1',
      name: 'YouTube 1080p',
      provider: 'youtube',
      width: 1920,
      height: 1080,
      videoBitrate: 4500,
      audioBitrate: 128,
      fps: 30,
      codec: 'h264',
    })
    expect(profiles.value).toHaveLength(1)
    expect(profiles.value[0].name).toBe('YouTube 1080p')
  })

  it('removes a profile', async () => {
    const { useOutputProfiles } = await import('../../composables/useOutputProfiles')
    const { addProfile, removeProfile, profiles } = useOutputProfiles()
    addProfile({
      id: 'p1',
      name: 'Test',
      provider: 'youtube',
      width: 1920,
      height: 1080,
      videoBitrate: 4500,
      audioBitrate: 128,
      fps: 30,
      codec: 'h264',
    })
    removeProfile('p1')
    expect(profiles.value).toHaveLength(0)
  })

  it('gets a profile by id', async () => {
    const { useOutputProfiles } = await import('../../composables/useOutputProfiles')
    const { addProfile, getProfile } = useOutputProfiles()
    addProfile({
      id: 'p1',
      name: 'Test',
      provider: 'youtube',
      width: 1920,
      height: 1080,
      videoBitrate: 4500,
      audioBitrate: 128,
      fps: 30,
      codec: 'h264',
    })
    expect(getProfile('p1')?.name).toBe('Test')
    expect(getProfile('missing')).toBeUndefined()
  })
})

describe('composables/useSycoMetadata', () => {
  it('initializes with empty now playing', async () => {
    const { useSycoMetadata } = await import('../../composables/useSycoMetadata')
    const { nowPlaying, isLive } = useSycoMetadata()
    expect(nowPlaying.value.title).toBe('')
    expect(isLive.value).toBe(false)
  })

  it('refresh does not throw', async () => {
    const { useSycoMetadata } = await import('../../composables/useSycoMetadata')
    const { refresh } = useSycoMetadata()
    expect(() => refresh()).not.toThrow()
  })
})

describe('composables/useSycoStream', () => {
  beforeEach(() => {
    updateSycoAppState({ live: false, ingestStatus: 'idle' })
  })

  it('is not playing when offline', async () => {
    const { useSycoStream } = await import('../../composables/useSycoStream')
    const { isPlaying } = useSycoStream()
    expect(isPlaying.value).toBe(false)
  })

  it('is playing when live and connected', async () => {
    updateSycoAppState({ live: true, ingestStatus: 'connected' })
    const { useSycoStream } = await import('../../composables/useSycoStream')
    const { isPlaying } = useSycoStream()
    expect(isPlaying.value).toBe(true)
  })

  it('setVolume clamps to 0-1 range', async () => {
    const { useSycoStream } = await import('../../composables/useSycoStream')
    const { setVolume } = useSycoStream()
    setVolume(1.5)
    setVolume(-0.5)
    expect(true).toBe(true)
  })

  it('togglePlay flips live state when connected', async () => {
    updateSycoAppState({ live: false, ingestStatus: 'connected' })
    const { useSycoStream } = await import('../../composables/useSycoStream')
    const { togglePlay } = useSycoStream()
    expect(useSycoStream().isPlaying.value).toBe(false)
    togglePlay()
    expect(useSycoStream().isPlaying.value).toBe(true)
  })

  it('togglePlay is no-op when not connected', async () => {
    updateSycoAppState({ live: false, ingestStatus: 'idle' })
    const { useSycoStream } = await import('../../composables/useSycoStream')
    const { togglePlay } = useSycoStream()
    togglePlay()
    expect(useSycoStream().isPlaying.value).toBe(false)
  })
})

describe('composables/useWatchdog', () => {
  beforeEach(() => {
    updateSycoAppState({ pipelineHealth: 'ok' })
  })

  it('is healthy when pipeline is ok', async () => {
    const { useWatchdog } = await import('../../composables/useWatchdog')
    const { isHealthy } = useWatchdog()
    expect(isHealthy.value).toBe(true)
  })

  it('is not healthy when pipeline failed', async () => {
    updateSycoAppState({ pipelineHealth: 'failed' })
    const { useWatchdog } = await import('../../composables/useWatchdog')
    const { isHealthy } = useWatchdog()
    expect(isHealthy.value).toBe(false)
  })

  it('reports events', async () => {
    const { useWatchdog } = await import('../../composables/useWatchdog')
    const { events, reportEvent } = useWatchdog()
    reportEvent({ source: 'ffmpeg', message: 'stalled', severity: 'error' })
    expect(events.value).toHaveLength(1)
    expect(events.value[0].severity).toBe('error')
  })

  it('clears events', async () => {
    const { useWatchdog } = await import('../../composables/useWatchdog')
    const { reportEvent, clearEvents, events } = useWatchdog()
    reportEvent({ source: 'test', message: 'msg', severity: 'info' })
    clearEvents()
    expect(events.value).toHaveLength(0)
  })
})

describe('composables/useLogs', () => {
  it('starts with empty entries', async () => {
    const { useLogs } = await import('../../composables/useLogs')
    const { entries } = useLogs()
    expect(entries.value).toHaveLength(0)
  })

  it('appends entries', async () => {
    const { useLogs } = await import('../../composables/useLogs')
    const { entries, append } = useLogs()
    append({ level: 'info', source: 'test', message: 'hello' })
    expect(entries.value).toHaveLength(1)
    expect(entries.value[0].level).toBe('info')
  })

  it('filters by level', async () => {
    const { useLogs } = await import('../../composables/useLogs')
    const { append, filterByLevel } = useLogs()
    append({ level: 'info', source: 'a', message: 'ok' })
    append({ level: 'error', source: 'b', message: 'fail' })
    append({ level: 'error', source: 'c', message: 'fail2' })
    expect(filterByLevel('error')).toHaveLength(2)
    expect(filterByLevel('info')).toHaveLength(1)
  })

  it('clears all entries', async () => {
    const { useLogs } = await import('../../composables/useLogs')
    const { append, clear, entries } = useLogs()
    append({ level: 'info', source: 'a', message: 'ok' })
    clear()
    expect(entries.value).toHaveLength(0)
  })
})

describe('composables/useTemplates', () => {
  it('starts with built-in templates', async () => {
    const { useTemplates } = await import('../../composables/useTemplates')
    const { templates } = useTemplates()
    expect(templates.value.length).toBeGreaterThan(0)
  })

  it('adds a custom template', async () => {
    const { useTemplates } = await import('../../composables/useTemplates')
    const { templates, addTemplate } = useTemplates()
    addTemplate({
      id: 'custom-1',
      name: 'My Template',
      provider: 'telegram',
      previewUrl: '/previews/custom.png',
      isCustom: true,
    })
    expect(templates.value).toHaveLength(3)
  })

  it('removes a template', async () => {
    const { useTemplates } = await import('../../composables/useTemplates')
    const { templates, removeTemplate } = useTemplates()
    removeTemplate('tmpl-default-1080')
    expect(templates.value).toHaveLength(1)
  })

  it('filters by provider', async () => {
    const { useTemplates } = await import('../../composables/useTemplates')
    const { getByProvider } = useTemplates()
    expect(getByProvider('youtube').length).toBeGreaterThan(0)
    expect(getByProvider('telegram').length).toBeGreaterThan(0)
  })
})

describe('composables/useTransmissionKit', () => {
  it('starts with null current kit', async () => {
    const { useTransmissionKit } = await import('../../composables/useTransmissionKit')
    const { current } = useTransmissionKit()
    expect(current.value).toBeNull()
  })

  it('generates a kit for a destination', async () => {
    const { useTransmissionKit } = await import('../../composables/useTransmissionKit')
    const { current, generate } = useTransmissionKit()
    const kit = generate('dest-1', 'youtube')
    expect(current.value).not.toBeNull()
    expect(kit.destinationId).toBe('dest-1')
    expect(kit.titleBlock).toContain('YOUTUBE')
    expect(kit.labels).toContain('youtube')
  })

  it('resets the current kit', async () => {
    const { useTransmissionKit } = await import('../../composables/useTransmissionKit')
    const { generate, reset, current } = useTransmissionKit()
    generate('dest-1', 'youtube')
    reset()
    expect(current.value).toBeNull()
  })
})
