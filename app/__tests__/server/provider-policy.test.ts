import { describe, expect, it } from 'vitest'
import { getProviderAdapter, validateProfileForProvider } from '../../server/provider-registry'
import type { DestinationState, OutputProfile } from '../../types'

const destination: DestinationState = {
  id: 'yt', provider: 'youtube', label: 'YouTube', protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'env:YOUTUBE_KEY',
  status: 'configured', health: null, lastHandshakeAt: null, lastError: null,
  videoProfile: 'yt-1080', audioProfile: 'aac', monitorMode: 'platform-ack',
  requiresManualPlatformSetup: true, capabilities: [], transmissionKitId: null, notes: '',
}
const profile: OutputProfile = {
  id: 'yt-1080', name: '1080p30', provider: 'youtube', width: 1920, height: 1080,
  videoBitrate: 4500, audioBitrate: 160, fps: 30, codec: 'libx264',
}

describe('provider policies', () => {
  it('accepts a valid provider destination and profile', () => {
    expect(getProviderAdapter('youtube').validate(destination)).toEqual([])
    expect(validateProfileForProvider(profile)).toEqual([])
  })

  it('rejects protocol mismatches and unsupported monitoring', () => {
    expect(getProviderAdapter('telegram').validate({ ...destination, provider: 'telegram', protocol: 'rtmp', monitorMode: 'platform-ack' }))
      .toEqual(expect.arrayContaining([expect.stringContaining('does not match'), expect.stringContaining('acknowledgement')]))
  })

  it('rejects profiles outside provider limits', () => {
    const errors = validateProfileForProvider({ ...profile, provider: 'twitch', videoBitrate: 20000 })
    expect(errors.join(' ')).toContain('video bitrate')
  })
})
