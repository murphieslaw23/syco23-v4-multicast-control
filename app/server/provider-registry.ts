import type { DestinationState, OutputProfile, Provider } from '../types'
import type { SecretStore } from './runtime/secret-store'

export interface ProviderCapabilities {
  protocols: Array<'rtmp' | 'rtmps'>
  metadata: boolean
  platformAck: boolean
  hlsPlayback: boolean
  manualSetup: boolean
}

export interface ProviderProfilePolicy {
  widths: number[]
  heights: number[]
  fps: number[]
  videoBitrateKbps: { min: number; max: number }
  audioBitrateKbps: { min: number; max: number }
  codecs: string[]
  keyframeIntervalSeconds: number
  preferredEndpoint?: string
}

export interface ProviderAdapter {
  id: Provider
  label: string
  capabilities: ProviderCapabilities
  profilePolicy: ProviderProfilePolicy
  validate(destination: DestinationState): string[]
  validateProfile(profile: OutputProfile): string[]
  buildOutputUrl(destination: DestinationState, streamKey?: string): string
  probe(destination: DestinationState, secrets: SecretStore, timeoutMs: number): Promise<{ live: boolean; httpStatus: number; message: string }>
  publishMetadata(destination: DestinationState, metadata: Record<string, unknown>, secrets: SecretStore, timeoutMs: number): Promise<{ httpStatus: number; message: string }>
  normalizeError(error: unknown): string
}

const COMMON_RTMP = /^rtmps?:\/\//i
const DEFAULT_POLICY: ProviderProfilePolicy = {
  widths: [640, 854, 1280, 1920, 2560, 3840],
  heights: [360, 480, 720, 1080, 1440, 2160],
  fps: [24, 25, 30, 50, 60],
  videoBitrateKbps: { min: 300, max: 51000 },
  audioBitrateKbps: { min: 64, max: 320 },
  codecs: ['libx264', 'h264_nvenc', 'h264_qsv', 'h264_vaapi'],
  keyframeIntervalSeconds: 2,
}

function createRtmpProvider(
  id: Provider,
  label: string,
  options: {
    capabilities?: Partial<ProviderCapabilities>
    policy?: Partial<ProviderProfilePolicy>
  } = {},
): ProviderAdapter {
  const capabilities: ProviderCapabilities = {
    protocols: ['rtmp', 'rtmps'],
    metadata: false,
    platformAck: false,
    hlsPlayback: false,
    manualSetup: true,
    ...options.capabilities,
  }
  const profilePolicy: ProviderProfilePolicy = {
    ...DEFAULT_POLICY,
    ...options.policy,
    videoBitrateKbps: {
      ...DEFAULT_POLICY.videoBitrateKbps,
      ...options.policy?.videoBitrateKbps,
    },
    audioBitrateKbps: {
      ...DEFAULT_POLICY.audioBitrateKbps,
      ...options.policy?.audioBitrateKbps,
    },
  }

  return {
    id,
    label,
    capabilities,
    profilePolicy,
    validate(destination) {
      const errors: string[] = []
      if (!destination.label.trim()) errors.push('Destination label is required')
      if (!COMMON_RTMP.test(destination.endpointUrl)) errors.push('Endpoint must use RTMP or RTMPS')
      if (!destination.streamKeyRef.trim()) errors.push('Stream key reference is required')
      if (!capabilities.protocols.includes(destination.protocol)) {
        errors.push(`${label} does not support ${destination.protocol.toUpperCase()}`)
      }
      const endpointProtocol = destination.endpointUrl.toLowerCase().startsWith('rtmps://') ? 'rtmps' : 'rtmp'
      if (COMMON_RTMP.test(destination.endpointUrl) && endpointProtocol !== destination.protocol) {
        errors.push(`Configured protocol ${destination.protocol.toUpperCase()} does not match endpoint URL`)
      }
      if (destination.monitorMode === 'platform-ack' && !capabilities.platformAck) {
        errors.push(`${label} does not provide platform acknowledgement monitoring`)
      }
      if (destination.monitorMode === 'hls-playback' && !capabilities.hlsPlayback) {
        errors.push(`${label} does not provide HLS playback monitoring`)
      }
      if (destination.providerMetadataUrl && !capabilities.metadata) errors.push(`${label} does not support metadata publishing`)
      for (const [name,value] of [['HLS playback',destination.hlsPlaybackUrl],['Provider acknowledgement',destination.providerAckUrl],['Provider metadata',destination.providerMetadataUrl]] as const) {
        if (!value) continue
        try { const url = new URL(value); if (!['http:','https:'].includes(url.protocol)) errors.push(`${name} URL must use HTTP or HTTPS`) } catch { errors.push(`${name} URL is invalid`) }
      }
      return errors
    },
    validateProfile(profile) {
      const errors: string[] = []
      if (profile.provider !== id && profile.provider !== 'custom-rtmp') {
        errors.push(`Profile provider ${profile.provider} does not match ${label}`)
      }
      if (!profilePolicy.widths.includes(profile.width) || !profilePolicy.heights.includes(profile.height)) {
        errors.push(`${label} does not support ${profile.width}x${profile.height}`)
      }
      if (!profilePolicy.fps.includes(profile.fps)) errors.push(`${label} does not support ${profile.fps} FPS`)
      if (profile.videoBitrate < profilePolicy.videoBitrateKbps.min || profile.videoBitrate > profilePolicy.videoBitrateKbps.max) {
        errors.push(`${label} video bitrate must be ${profilePolicy.videoBitrateKbps.min}-${profilePolicy.videoBitrateKbps.max} kbps`)
      }
      if (profile.audioBitrate < profilePolicy.audioBitrateKbps.min || profile.audioBitrate > profilePolicy.audioBitrateKbps.max) {
        errors.push(`${label} audio bitrate must be ${profilePolicy.audioBitrateKbps.min}-${profilePolicy.audioBitrateKbps.max} kbps`)
      }
      if (!profilePolicy.codecs.includes(profile.codec)) errors.push(`${label} does not support codec ${profile.codec}`)
      return errors
    },
    buildOutputUrl(destination, streamKey) {
      const endpoint = destination.endpointUrl.replace(/\/+$/, '')
      if (!streamKey?.trim()) throw new Error(`Unresolved stream key for ${destination.label}`)
      const key = streamKey.trim().replace(/^\/+/, '')
      return `${endpoint}/${key}`
    },
    async probe(destination, secrets, timeoutMs) {
      const target = destination.monitorMode === 'hls-playback' ? destination.hlsPlaybackUrl : destination.providerAckUrl
      if (!target) throw new Error(`${label} monitoring URL is not configured`)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const headers: Record<string,string> = { accept: destination.monitorMode === 'hls-playback' ? 'application/vnd.apple.mpegurl,application/x-mpegURL,text/plain;q=0.8,*/*;q=0.1' : 'application/json' }
        if (destination.providerApiSecretRef) headers.authorization = `Bearer ${await secrets.resolve(destination.providerApiSecretRef)}`
        const response = await fetch(target, { method: 'GET', headers, signal: controller.signal, redirect: 'follow' })
        const body = await response.text()
        if (!response.ok) throw new Error(`${label} probe returned HTTP ${response.status}`)
        if (destination.monitorMode === 'hls-playback') {
          const live = body.includes('#EXTM3U') && (body.includes('#EXTINF') || body.includes('#EXT-X-STREAM-INF'))
          return { live, httpStatus: response.status, message: live ? 'Playback manifest is active' : 'Playback manifest is not active' }
        }
        let value: unknown = body
        try { value = JSON.parse(body) } catch {}
        const record = typeof value === 'object' && value ? value as Record<string,unknown> : {}
        const state = String(record.status ?? record.state ?? record.stream_status ?? record.live ?? '').toLowerCase()
        const live = record.live === true || ['live','online','active','streaming','ready'].includes(state)
        return { live, httpStatus: response.status, message: live ? 'Platform acknowledged live stream' : `Platform state: ${state || 'unknown'}` }
      } finally { clearTimeout(timer) }
    },
    async publishMetadata(destination, metadata, secrets, timeoutMs) {
      if (!destination.providerMetadataUrl) throw new Error(`${label} metadata endpoint is not configured`)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeoutMs)
      try {
        const headers: Record<string,string> = { 'content-type': 'application/json', accept: 'application/json' }
        if (destination.providerApiSecretRef) headers.authorization = `Bearer ${await secrets.resolve(destination.providerApiSecretRef)}`
        const payload = { title: String(metadata.title || ''), artist: String(metadata.artist || ''), show: metadata.show == null ? null : String(metadata.show), listeners: metadata.listeners == null ? null : Number(metadata.listeners) }
        const response = await fetch(destination.providerMetadataUrl, { method: 'PATCH', headers, body: JSON.stringify(payload), signal: controller.signal, redirect: 'follow' })
        if (!response.ok) throw new Error(`${label} metadata update returned HTTP ${response.status}`)
        return { httpStatus: response.status, message: 'Metadata published' }
      } finally { clearTimeout(timer) }
    },
    normalizeError(error) {
      if (error instanceof DOMException && error.name === 'AbortError') return `${label} request timed out`
      if (error instanceof Error) return error.message
      return String(error)
    },
  }
}

const adapters: Record<Provider, ProviderAdapter> = {
  youtube: createRtmpProvider('youtube', 'YouTube', {
    capabilities: { metadata: true, platformAck: true, hlsPlayback: true },
    policy: { videoBitrateKbps: { min: 1000, max: 51000 }, audioBitrateKbps: { min: 128, max: 320 } },
  }),
  telegram: createRtmpProvider('telegram', 'Telegram', {
    policy: { widths: [640, 854, 1280, 1920], heights: [360, 480, 720, 1080], fps: [25, 30, 50, 60], videoBitrateKbps: { min: 500, max: 8000 } },
  }),
  tiktok: createRtmpProvider('tiktok', 'TikTok', {
    policy: { widths: [720, 1080, 1280, 1920], heights: [720, 1080, 1280, 1920], fps: [25, 30, 50, 60], videoBitrateKbps: { min: 1000, max: 12000 } },
  }),
  twitch: createRtmpProvider('twitch', 'Twitch', {
    capabilities: { metadata: true, platformAck: true, hlsPlayback: true },
    policy: { widths: [640, 854, 1280, 1920], heights: [360, 480, 720, 1080], videoBitrateKbps: { min: 500, max: 8500 }, audioBitrateKbps: { min: 96, max: 320 } },
  }),
  instagram: createRtmpProvider('instagram', 'Instagram', {
    policy: { widths: [720, 1080, 1280, 1920], heights: [720, 1080, 1280, 1920], fps: [25, 30, 50, 60], videoBitrateKbps: { min: 500, max: 9000 } },
  }),
  mixer: createRtmpProvider('mixer', 'Mixer'),
  mixcloud: createRtmpProvider('mixcloud', 'Mixcloud', {
    capabilities: { metadata: true },
    policy: { widths: [640, 854, 1280, 1920], heights: [360, 480, 720, 1080], videoBitrateKbps: { min: 500, max: 10000 } },
  }),
  facebook: createRtmpProvider('facebook', 'Facebook', {
    capabilities: { metadata: true, platformAck: true },
    policy: { widths: [640, 854, 1280, 1920], heights: [360, 480, 720, 1080], videoBitrateKbps: { min: 400, max: 9000 } },
  }),
  'custom-rtmp': createRtmpProvider('custom-rtmp', 'Custom RTMP', { capabilities: { manualSetup: false } }),
  local: createRtmpProvider('local', 'Local Output', { capabilities: { manualSetup: false, hlsPlayback: true } }),
}

export function getProviderAdapter(provider: Provider): ProviderAdapter {
  const adapter = adapters[provider]
  if (!adapter) throw new Error(`Unsupported provider: ${provider}`)
  return adapter
}

export function listProviderAdapters(): ProviderAdapter[] {
  return Object.values(adapters)
}

export function validateProfileForProvider(profile: OutputProfile, provider: Provider = profile.provider): string[] {
  return getProviderAdapter(provider).validateProfile({ ...profile, provider })
}
