import { describe, it, expect, beforeEach, vi } from 'vitest'
import { updateSycoAppState } from '../../composables/store'

describe('composables/usePipeline', () => {
  const destination = { id: 'dst', provider: 'custom-rtmp' as const, label: 'Test', protocol: 'rtmp' as const, endpointUrl: 'rtmp://localhost/live', streamKeyRef: 'TEST_KEY', status: 'configured' as const, health: null, lastHandshakeAt: null, lastError: null, videoProfile: '1080p', audioProfile: '128k', monitorMode: 'rtmp-output' as const, requiresManualPlatformSetup: false, capabilities: [], transmissionKitId: null, notes: '' }
  beforeEach(() => {
    let stopped = false
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/pipeline/stop')) { stopped = true; return new Response(JSON.stringify({ ok: true, data: { state: 'idle' } }), { status: 200, headers: { 'content-type': 'application/json' } }) }
      if (url.includes('/api/status')) return new Response(JSON.stringify({ ok: true, data: { live: !stopped, pipelineHealth: 'ok', ingestStatus: stopped ? 'idle' : 'connected', destinations: 1, supervisor: { state: stopped ? 'idle' : 'running', pid: 10, startedAt: new Date().toISOString(), restartCount: 0, lastError: null, metrics: { fps: 30, bitrateKbps: 4500, outTimeMs: 1000 } } } }), { status: 200, headers: { 'content-type': 'application/json' } })
      stopped = false
      return new Response(JSON.stringify({ ok: true, data: { state: 'running' } }), { status: 202, headers: { 'content-type': 'application/json' } })
    }))
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

  it('starts in idle state', async () => {
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    expect(pipeline.status.value.state).toBe('idle')
    expect(pipeline.isRunning.value).toBe(false)
  })

  it('transitions to running on start', async () => {
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    await pipeline.start({
      sourceUrl: 'rtmp://x',
      destinations: [destination],
      videoProfile: '1080p',
      audioProfile: '128k',
    })
    expect(pipeline.status.value.state).toBe('running')
    expect(pipeline.isRunning.value).toBe(true)
    expect(pipeline.status.value.fps).toBe(30)
  })

  it('transitions to idle on stop', async () => {
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    await pipeline.start({ sourceUrl: 'rtmp://x', destinations: [destination], videoProfile: '1080p', audioProfile: '128k' })
    await pipeline.stop()
    expect(pipeline.status.value.state).toBe('idle')
    expect(pipeline.isRunning.value).toBe(false)
  })

  it('restart stops then starts', async () => {
    updateSycoAppState({ sourceUrl: 'rtmp://x' })
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    await pipeline.start({ sourceUrl: 'rtmp://x', destinations: [destination], videoProfile: '1080p', audioProfile: '128k' })
    await pipeline.restart()
    expect(pipeline.status.value.state).toBe('running')
  })

  it('restart handles null sourceUrl with fallback', async () => {
    updateSycoAppState({ sourceUrl: null })
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    await pipeline.start({ sourceUrl: 'rtmp://x', destinations: [destination], videoProfile: '1080p', audioProfile: '128k' })
    await pipeline.restart()
    expect(pipeline.status.value.state).toBe('running')
  })

  it('reportHealth updates pipeline health', async () => {
    const { usePipeline } = await import('../../composables/usePipeline')
    const pipeline = usePipeline()
    pipeline.reportHealth('degraded')
    expect(pipeline.health.value).toBe('degraded')
  })
})

describe('composables/useWatchdogService', () => {
  beforeEach(() => {
    updateSycoAppState({ pipelineHealth: 'ok' })
  })

  it('starts unmonitored', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    expect(wd.isMonitored.value).toBe(false)
  })

  it('can start and stop monitoring', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.startMonitoring()
    expect(wd.isMonitored.value).toBe(true)
    wd.stopMonitoring()
    expect(wd.isMonitored.value).toBe(false)
  })

  it('runCheck increments counter', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.runCheck(30, false)
    expect(wd.status.value.checksCount).toBe(1)
    wd.runCheck(25, false)
    expect(wd.status.value.checksCount).toBe(2)
  })

  it('runCheck triggers recovery on stall', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.runCheck(0, true)
    expect(wd.status.value.recoveryActions).toBe(1)
  })

  it('runCheck triggers recovery on low fps', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.runCheck(5, false)
    expect(wd.status.value.recoveryActions).toBe(1)
  })

  it('runCheck does not trigger recovery on healthy fps', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.runCheck(30, false)
    expect(wd.status.value.recoveryActions).toBe(0)
  })

  it('triggerRecovery increments counter', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    wd.triggerRecovery('test')
    wd.triggerRecovery('test')
    expect(wd.status.value.recoveryActions).toBe(2)
  })

  it('thresholds have expected defaults', async () => {
    const { useWatchdogService } = await import('../../composables/useWatchdogService')
    const wd = useWatchdogService()
    expect(wd.thresholds.stallSeconds).toBe(15)
    expect(wd.thresholds.reconnectAttempts).toBe(3)
    expect(wd.thresholds.degradedFps).toBe(10)
  })
})
