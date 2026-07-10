import { afterEach, describe, expect, it, vi } from 'vitest'
import { getProviderAdapter } from '../../server/provider-registry'
import { EnvironmentSecretStore } from '../../server/runtime/secret-store'
import type { DestinationState } from '../../types'

const destination = (patch: Partial<DestinationState> = {}): DestinationState => ({
  id: 'youtube-main', provider: 'youtube', label: 'YouTube Main', protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'env:YOUTUBE_KEY',
  status: 'live', health: 'ok', lastHandshakeAt: null, lastError: null,
  videoProfile: '1080p', audioProfile: '128k', monitorMode: 'platform-ack',
  providerAckUrl: 'https://monitor.example/ack', providerMetadataUrl: 'https://monitor.example/metadata',
  providerApiSecretRef: 'env:PROVIDER_API_TOKEN', requiresManualPlatformSetup: false,
  capabilities: [], transmissionKitId: null, notes: '', ...patch,
})

afterEach(() => { vi.unstubAllGlobals(); delete process.env.PROVIDER_API_TOKEN })

describe('provider acknowledgement and metadata transport', () => {
  it('normalizes a live platform acknowledgement and sends bearer auth', async () => {
    process.env.PROVIDER_API_TOKEN = 'secret-token'
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: 'live' }), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await getProviderAdapter('youtube').probe(destination(), new EnvironmentSecretStore(), 1000)
    expect(result.live).toBe(true)
    expect(fetchMock.mock.calls[0][1].headers.authorization).toBe('Bearer secret-token')
  })

  it('recognizes an active HLS manifest', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('#EXTM3U\n#EXTINF:2,\nsegment.ts', { status: 200 })))
    const result = await getProviderAdapter('youtube').probe(destination({ monitorMode: 'hls-playback', hlsPlaybackUrl: 'https://video.example/live.m3u8', providerApiSecretRef: undefined }), new EnvironmentSecretStore(), 1000)
    expect(result.live).toBe(true)
  })

  it('publishes normalized metadata to the configured provider endpoint', async () => {
    process.env.PROVIDER_API_TOKEN = 'secret-token'
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await getProviderAdapter('youtube').publishMetadata(destination(), { title: 'Track', artist: 'Artist', listeners: 23 }, new EnvironmentSecretStore(), 1000)
    expect(fetchMock.mock.calls[0][1].method).toBe('PATCH')
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ title: 'Track', artist: 'Artist', listeners: 23 })
  })
})
