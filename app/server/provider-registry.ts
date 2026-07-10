import type { DestinationState, Provider } from '../types'

export interface ProviderCapabilities {
  protocols: Array<'rtmp' | 'rtmps'>
  metadata: boolean
  platformAck: boolean
  hlsPlayback: boolean
  manualSetup: boolean
}

export interface ProviderAdapter {
  id: Provider
  label: string
  capabilities: ProviderCapabilities
  validate(destination: DestinationState): string[]
  buildOutputUrl(destination: DestinationState, streamKey?: string): string
}

const COMMON_RTMP = /^rtmps?:\/\//i

function createRtmpProvider(
  id: Provider,
  label: string,
  overrides: Partial<ProviderCapabilities> = {},
): ProviderAdapter {
  const capabilities: ProviderCapabilities = {
    protocols: ['rtmp', 'rtmps'],
    metadata: false,
    platformAck: false,
    hlsPlayback: false,
    manualSetup: true,
    ...overrides,
  }

  return {
    id,
    label,
    capabilities,
    validate(destination) {
      const errors: string[] = []
      if (!destination.label.trim()) errors.push('Destination label is required')
      if (!COMMON_RTMP.test(destination.endpointUrl)) errors.push('Endpoint must use RTMP or RTMPS')
      if (!destination.streamKeyRef.trim()) errors.push('Stream key reference is required')
      if (!capabilities.protocols.includes(destination.protocol)) {
        errors.push(`${label} does not support ${destination.protocol.toUpperCase()}`)
      }
      return errors
    },
    buildOutputUrl(destination, streamKey) {
      const endpoint = destination.endpointUrl.replace(/\/+$/, '')
      if (!streamKey?.trim()) throw new Error(`Unresolved stream key for ${destination.label}`)
      const key = streamKey.trim().replace(/^\/+/, '')
      return `${endpoint}/${key}`
    },
  }
}

const adapters: Record<Provider, ProviderAdapter> = {
  youtube: createRtmpProvider('youtube', 'YouTube', { metadata: true, platformAck: true, hlsPlayback: true }),
  telegram: createRtmpProvider('telegram', 'Telegram'),
  tiktok: createRtmpProvider('tiktok', 'TikTok'),
  twitch: createRtmpProvider('twitch', 'Twitch', { metadata: true, platformAck: true, hlsPlayback: true }),
  instagram: createRtmpProvider('instagram', 'Instagram'),
  mixer: createRtmpProvider('mixer', 'Mixer'),
  mixcloud: createRtmpProvider('mixcloud', 'Mixcloud', { metadata: true }),
  facebook: createRtmpProvider('facebook', 'Facebook', { metadata: true, platformAck: true }),
  'custom-rtmp': createRtmpProvider('custom-rtmp', 'Custom RTMP', { manualSetup: false }),
  local: createRtmpProvider('local', 'Local Output', { manualSetup: false, hlsPlayback: true }),
}

export function getProviderAdapter(provider: Provider): ProviderAdapter {
  return adapters[provider]
}

export function listProviderAdapters(): ProviderAdapter[] {
  return Object.values(adapters)
}
