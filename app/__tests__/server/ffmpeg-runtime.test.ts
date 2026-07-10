import { describe, expect, it } from 'vitest'
import { buildFfmpegFanoutCommand } from '../../server/ffmpeg/command-builder'
import { PipelineSupervisor } from '../../server/ffmpeg/supervisor'
import type { DestinationState, OutputProfile } from '../../types'

const destination: DestinationState = {
  id: 'dst_1', provider: 'youtube', label: 'YouTube', protocol: 'rtmps',
  endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'YOUTUBE_KEY',
  status: 'armed', health: null, lastHandshakeAt: null, lastError: null,
  videoProfile: 'profile_1', audioProfile: 'aac', monitorMode: 'platform-ack',
  requiresManualPlatformSetup: true, capabilities: [], transmissionKitId: null, notes: '',
}

const profile: OutputProfile = {
  id: 'profile_1', name: '1080p30', provider: 'youtube', width: 1920, height: 1080,
  videoBitrate: 4500, audioBitrate: 160, fps: 30, codec: 'libx264',
}

describe('FFmpeg fan-out builder', () => {
  it('builds and redacts a multi-output command', () => {
    const result = buildFfmpegFanoutCommand({
      inputUrl: 'https://radio.example/live.mp3',
      destinations: [destination, { ...destination, id: 'dst_2', provider: 'twitch', label: 'Twitch', endpointUrl: 'rtmps://live.twitch.tv/app' }],
      profiles: [profile],
      streamKeys: { YOUTUBE_KEY: 'secret-key' },
    })
    expect(result.outputCount).toBe(2)
    expect(result.args.join(' ')).toContain('secret-key')
    expect(result.redactedArgs.join(' ')).not.toContain('secret-key')
  })

  it('rejects unsupported input protocols', () => {
    expect(() => buildFfmpegFanoutCommand({ inputUrl: 'javascript:alert(1)', destinations: [destination], profiles: [profile] })).toThrow('Unsupported input protocol')
  })
})

describe('pipeline supervisor', () => {
  it('enforces lifecycle transitions', () => {
    const supervisor = new PipelineSupervisor()
    supervisor.transition('preparing')
    supervisor.transition('starting')
    supervisor.attachProcess(1234)
    expect(supervisor.getSnapshot().state).toBe('running')
    supervisor.transition('stopping')
    supervisor.transition('idle')
    expect(supervisor.getSnapshot().pid).toBeNull()
  })

  it('records failure state', () => {
    const supervisor = new PipelineSupervisor()
    supervisor.transition('preparing')
    supervisor.fail(new Error('encoder unavailable'))
    expect(supervisor.getSnapshot()).toMatchObject({ state: 'failed', health: 'failed', lastError: 'encoder unavailable' })
  })
})
