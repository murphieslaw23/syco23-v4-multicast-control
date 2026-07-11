import type { DestinationState, OutputProfile, SceneGraph } from '../../contracts/domain'
import { compileSceneFilterComplex } from '../scene/scene-runtime'
import { getProviderAdapter } from '../provider-registry'

export interface FfmpegBuildOptions {
  inputUrl: string
  destinations: DestinationState[]
  profiles: OutputProfile[]
  streamKeys?: Record<string, string>
  ffmpegPath?: string
  reconnect?: boolean
  scene?: SceneGraph
  sceneMetadata?: Record<string, string | number | undefined>
  sceneAssets?: Record<string, string>
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
    const errors = [...adapter.validate(destination), ...adapter.validateProfile({ ...profile, provider: destination.provider })]
    if (errors.length) throw new Error(`${destination.label}: ${errors.join('; ')}`)

    const streamKey = options.streamKeys?.[destination.streamKeyRef]
    const outputUrl = adapter.buildOutputUrl(destination, streamKey)

    const scene = options.scene ? { ...options.scene, width: profile.width, height: profile.height } : null
    if (scene) {
      const complex = compileSceneFilterComplex(scene, options.sceneMetadata, options.sceneAssets, String(args.length))
      args.push('-filter_complex', complex.graph, '-map', `[${complex.outputLabel}]`, '-map', '0:a:0?')
    } else {
      args.push('-map', '0:v:0?', '-map', '0:a:0?', '-vf', `scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2:color=black`)
    }
    args.push(
      '-c:v', profile.codec || 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-r', String(profile.fps),
      '-b:v', `${profile.videoBitrate}k`,
      '-maxrate', `${profile.videoBitrate}k`,
      '-bufsize', `${profile.videoBitrate * 2}k`,
      '-g', String(profile.fps * adapter.profilePolicy.keyframeIntervalSeconds),
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
