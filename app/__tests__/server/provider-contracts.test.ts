import { afterEach, describe, expect, it, vi } from 'vitest'
import { listProviderAdapters } from '../../server/provider-registry'
import type { SecretStore } from '../../server/runtime/secret-store'
import type { DestinationState, OutputProfile } from '../../types'

const secretStore: SecretStore = {
  async resolve() {
    return 'provider-secret'
  },
}

function destinationFor(provider: DestinationState['provider']): DestinationState {
  return {
    id: `${provider}-destination`,
    provider,
    label: `${provider} main`,
    protocol: 'rtmps',
    endpointUrl: `rtmps://ingest.example.test/${provider}`,
    streamKeyRef: 'env:PROVIDER_STREAM_KEY',
    status: 'configured',
    health: null,
    lastHandshakeAt: null,
    lastError: null,
    videoProfile: `${provider}-profile`,
    audioProfile: 'aac-160',
    monitorMode: 'rtmp-output',
    requiresManualPlatformSetup: true,
    capabilities: [],
    transmissionKitId: null,
    notes: '',
  }
}

function profileFor(adapter: ReturnType<typeof listProviderAdapters>[number]): OutputProfile {
  return {
    id: `${adapter.id}-profile`,
    name: `${adapter.label} contract profile`,
    provider: adapter.id,
    width: adapter.profilePolicy.widths[0],
    height: adapter.profilePolicy.heights[0],
    fps: adapter.profilePolicy.fps[0],
    videoBitrate: adapter.profilePolicy.videoBitrateKbps.min,
    audioBitrate: adapter.profilePolicy.audioBitrateKbps.min,
    codec: adapter.profilePolicy.codecs[0],
  }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('provider adapter contract matrix', () => {
  it('registers every first-class provider exactly once', () => {
    const adapters = listProviderAdapters()
    expect(adapters.map(adapter => adapter.id)).toEqual([
      'youtube',
      'telegram',
      'tiktok',
      'twitch',
      'instagram',
      'mixer',
      'mixcloud',
      'facebook',
      'custom-rtmp',
      'local',
    ])
    expect(new Set(adapters.map(adapter => adapter.id)).size).toBe(adapters.length)
  })

  it.each(listProviderAdapters().map(adapter => [adapter.id, adapter] as const))(
    '%s accepts its baseline destination and profile contract',
    (_provider, adapter) => {
      const destination = destinationFor(adapter.id)
      expect(adapter.validate(destination)).toEqual([])
      expect(adapter.validateProfile(profileFor(adapter))).toEqual([])
      expect(adapter.buildOutputUrl(destination, 'stream/key')).toBe(
        `${destination.endpointUrl}/stream/key`,
      )
      expect(() => adapter.buildOutputUrl(destination)).toThrow('Unresolved stream key')
    },
  )

  it('probes platform acknowledgement with resolved bearer credentials', async () => {
    const adapter = listProviderAdapters().find(item => item.id === 'youtube')!
    const destination = {
      ...destinationFor('youtube'),
      monitorMode: 'platform-ack' as const,
      providerAckUrl: 'https://provider.example.test/status',
      providerApiSecretRef: 'env:YOUTUBE_API_TOKEN',
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'live' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    )

    await expect(adapter.probe(destination, secretStore, 1000)).resolves.toEqual({
      live: true,
      httpStatus: 200,
      message: 'Platform acknowledged live stream',
    })
    expect(fetchSpy).toHaveBeenCalledWith(
      destination.providerAckUrl,
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({ authorization: 'Bearer provider-secret' }),
      }),
    )
  })

  it('publishes normalized metadata only for metadata-capable providers', async () => {
    const adapter = listProviderAdapters().find(item => item.id === 'mixcloud')!
    const destination = {
      ...destinationFor('mixcloud'),
      providerMetadataUrl: 'https://provider.example.test/metadata',
      providerApiSecretRef: 'env:MIXCLOUD_API_TOKEN',
    }
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 }))

    await expect(adapter.publishMetadata(destination, {
      title: 'Transmission 23',
      artist: 'SYSTEM CORRUPT',
      listeners: 23,
    }, secretStore, 1000)).resolves.toEqual({
      httpStatus: 204,
      message: 'Metadata published',
    })

    const metadataCall = fetchSpy.mock.calls.find(([, request]) => request?.method === 'PATCH')
    expect(metadataCall).toBeDefined()
    const request = metadataCall?.[1]
    expect(request?.method).toBe('PATCH')
    expect(request?.headers).toEqual(expect.objectContaining({ authorization: 'Bearer provider-secret' }))
    expect(JSON.parse(String(request?.body))).toEqual({
      title: 'Transmission 23',
      artist: 'SYSTEM CORRUPT',
      show: null,
      listeners: 23,
    })
  })
})
