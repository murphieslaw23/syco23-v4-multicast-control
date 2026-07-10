import { beforeEach, describe, expect, it } from 'vitest'
import { createApiRouteHandler } from '../../server/api-routes'
import { resetRuntimeStore } from '../../server/runtime-store'
import type { DestinationState } from '../../types'

const destination: DestinationState = {
  id: '',
  provider: 'youtube',
  label: 'Main YouTube',
  protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2',
  streamKeyRef: 'env:YOUTUBE_STREAM_KEY',
  status: 'configured',
  health: null,
  lastHandshakeAt: null,
  lastError: null,
  videoProfile: '1080p30',
  audioProfile: 'aac-160k',
  monitorMode: 'platform-ack',
  requiresManualPlatformSetup: true,
  capabilities: ['metadata'],
  transmissionKitId: null,
  notes: '',
}

describe('runtime API route handler', () => {
  beforeEach(resetRuntimeStore)

  it('creates and returns destinations', async () => {
    const api = createApiRouteHandler()
    const created = await api('POST /api/destinations', { body: destination })
    expect(created.ok).toBe(true)
    expect(created.data.id).toMatch(/^dst_/)

    const listed = await api('GET /api/destinations')
    expect(listed.data).toHaveLength(1)
  })

  it('rejects malformed destination endpoints', async () => {
    const api = createApiRouteHandler()
    const result = await api('POST /api/destinations', {
      body: { ...destination, endpointUrl: 'https://example.com' },
    })
    expect(result.ok).toBe(false)
    expect(result.status).toBe(422)
  })

  it('starts a session and exposes live status and logs', async () => {
    const api = createApiRouteHandler()
    const session = await api('POST /api/streams', { body: { title: 'Night Transmission' } })
    expect(session.data.id).toMatch(/^session_/)

    const status = await api('GET /api/status')
    expect(status.data.live).toBe(true)
    expect(status.data.ingestStatus).toBe('connected')

    const logs = await api('GET /api/logs')
    expect(logs.data[0]?.message).toContain('Night Transmission')
  })
})
