import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSycoAppState } from '../../composables/store'
import { useRuntimeDestinationMatrix } from '../../composables/useRuntimeDestinationMatrix'
import type { DestinationState } from '../../contracts/domain'

const base: DestinationState = {
  id: 'yt-main', provider: 'youtube', label: 'YouTube', protocol: 'rtmps', endpointUrl: 'rtmps://example/live',
  streamKeyRef: 'env:YOUTUBE_KEY', status: 'configured', health: null, lastHandshakeAt: null, lastError: null,
  videoProfile: '1080p', audioProfile: '128k', monitorMode: 'rtmp-output', requiresManualPlatformSetup: false,
  capabilities: [], transmissionKitId: null, notes: '', version: 1,
}

beforeEach(() => {
  setSycoAppState({
    live: false, sessionId: null, uptime: null, streamStatus: 'offline', sourceUrl: null, ingestStatus: 'idle',
    title: '', artist: '', destinations: [], pipelineHealth: 'ok', uiMode: 'portrait', collapsedNav: false,
  })
})

describe('useRuntimeDestinationMatrix', () => {
  it('loads and persists create, status, and delete operations with versions', async () => {
    const api = {
      destinations: vi.fn().mockResolvedValue([base]),
      createDestination: vi.fn().mockImplementation(async (input: DestinationState) => ({ ...input, version: 1 })),
      updateDestination: vi.fn().mockResolvedValue({ ...base, status: 'armed', version: 2 }),
      deleteDestination: vi.fn().mockResolvedValue(undefined),
    }
    const matrix = useRuntimeDestinationMatrix(api)

    await matrix.load()
    expect(matrix.destinations.value).toEqual([base])

    const second = { ...base, id: 'tg-main', provider: 'telegram' as const, label: 'Telegram', version: undefined }
    await matrix.add(second)
    expect(api.createDestination).toHaveBeenCalledWith(second)
    expect(matrix.destinations.value).toHaveLength(2)

    await matrix.updateStatus('yt-main', 'armed')
    expect(api.updateDestination).toHaveBeenCalledWith('yt-main', { status: 'armed' }, 1)
    expect(matrix.destinations.value[0]).toMatchObject({ status: 'armed', version: 2 })

    await matrix.remove('yt-main')
    expect(api.deleteDestination).toHaveBeenCalledWith('yt-main', 2)
    expect(matrix.destinations.value.map(item => item.id)).toEqual(['tg-main'])
  })
})
