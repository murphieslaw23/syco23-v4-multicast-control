import type { DestinationState, OutputProfile } from '../../types'
import { getProviderAdapter } from '../provider-registry'

export interface FfmpegBuildOptions {
  inputUrl: string
  destinations: DestinationState[]
  profiles: OutputProfile[]
  streamKeys?: Record<string, string>
  ffmpegPath?: string
  reconnect?: boolean
}

export interface FfmpegCommand {
  executable: string
  args: string[]
  redactedArgs: string[]
  outputCount: number
}

const SAFE_INPUT_PROTOCOL = /^(https?|rtmps?|srt|udp|tcp|file):/i

function resolveProfile(destination: DestinationState, profiles: OutputProfile[]): OutputProfile {
  const profile = profiles.find((item) => item.id === destination.videoProfile || item.name === destination.videoProfile)
  if (profile) return profile
  return {
    id: 'fallback-1080p30',
    name: '1080p30',
    provider: destination.provider,
    width: 1920,
    height: 1080,
    videoBitrate: 4500,
    audioBitrate: 160,
    fps: 30,
    codec: 'libx264',
  }
}

function redact(value: string): string {
  return value.replace(/(rtmps?:\/\/[^/]+\/).+$/i, '$1***')
}

export function buildFfmpegFanoutCommand(options: FfmpegBuildOptions): FfmpegCommand {
  const inputUrl = options.inputUrl.trim()
  if (!inputUrl) throw new Error('Input URL is required')
  if (!SAFE_INPUT_PROTOCOL.test(inputUrl)) throw new Error('Unsupported input protocol')

  const active = options.destinations.filter((item) => !['disabled', 'failed'].includes(item.status))
  if (!active.length) throw new Error('At least one active destination is required')

  const args: string[] = ['-hide_banner', '-nostdin', '-loglevel', 'warning']
  if (options.reconnect !== false && /^https?:/i.test(inputUrl)) {
    args.push('-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5')
  }
  args.push('-i', inputUrl)

  for (const destination of active) {
    const profile = resolveProfile(destination, options.profiles)
    const adapter = getProviderAdapter(destination.provider)
    const errors = adapter.validate(destination)
    if (errors.length) throw new Error(`${destination.label}: ${errors.join('; ')}`)

    const streamKey = options.streamKeys?.[destination.streamKeyRef]
    const outputUrl = adapter.buildOutputUrl(destination, streamKey)

    args.push(
      '-map', '0:v:0?',
      '-map', '0:a:0?',
      '-c:v', profile.codec || 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-r', String(profile.fps),
      '-s', `${profile.width}x${profile.height}`,
      '-b:v', `${profile.videoBitrate}k`,
      '-maxrate', `${profile.videoBitrate}k`,
      '-bufsize', `${profile.videoBitrate * 2}k`,
      '-g', String(profile.fps * 2),
      '-c:a', 'aac',
      '-b:a', `${profile.audioBitrate}k`,
      '-ar', '48000',
      '-f', 'flv',
      outputUrl,
    )
  }

  return {
    executable: options.ffmpegPath || 'ffmpeg',
    args,
    redactedArgs: args.map(redact),
    outputCount: active.length,
  }
}
