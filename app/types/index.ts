export type UiMode = 'portrait' | 'landscape' | 'tablet' | 'tv'

export type DestinationStatus =
  | 'idle'
  | 'configured'
  | 'armed'
  | 'connecting'
  | 'live'
  | 'degraded'
  | 'failed'
  | 'cooldown'
  | 'disabled'

export type StreamStatus = 'online' | 'reconnecting' | 'offline' | 'standby'

export type PipelineHealth = 'ok' | 'degraded' | 'failed'

export type Provider =
  | 'youtube'
  | 'telegram'
  | 'tiktok'
  | 'twitch'
  | 'instagram'
  | 'mixer'
  | 'mixcloud'
  | 'facebook'
  | 'custom-rtmp'
  | 'local'

export interface LayoutState {
  mode: UiMode
}

export interface DestinationState {
  id: string
  provider: Provider
  label: string
  protocol: 'rtmp' | 'rtmps'
  endpointUrl: string
  streamKeyRef: string
  status: DestinationStatus
  health: 'ok' | 'degraded' | 'failed' | null
  lastHandshakeAt: string | null
  lastError: string | null
  videoProfile: string
  audioProfile: string
  monitorMode: 'rtmp-output' | 'platform-ack' | 'hls-playback'
  hlsPlaybackUrl?: string
  providerAckUrl?: string
  providerMetadataUrl?: string
  providerApiSecretRef?: string
  requiresManualPlatformSetup: boolean
  capabilities: string[]
  transmissionKitId: string | null
  notes: string
}

export interface SycoAppState {
  live: boolean
  sessionId: string | null
  uptime: string | null
  streamStatus: StreamStatus
  sourceUrl: string | null
  ingestStatus: 'connected' | 'degraded' | 'failed' | 'idle'
  title: string
  artist: string
  show?: string
  artworkUrl?: string
  backgroundUrl?: string
  listeners?: number
  bitrate?: number
  codec?: string
  destinations: DestinationState[]
  pipelineHealth: PipelineHealth
  uiMode: UiMode
  collapsedNav: boolean
}

export interface OutputProfile {
  id: string
  name: string
  provider: Provider
  width: number
  height: number
  videoBitrate: number
  audioBitrate: number
  fps: number
  codec: string
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'warning' | 'error' | 'success' | 'debug'
  source: string
  message: string
}

export type SceneLayerType = 'background' | 'box' | 'text' | 'asset' | 'clock' | 'metadata'

export interface SceneLayer {
  id: string
  type: SceneLayerType
  x: number
  y: number
  width?: number
  height?: number
  zIndex: number
  opacity?: number
  visible?: boolean
  color?: string
  text?: string
  fontSize?: number
  fontWeight?: number
  align?: 'left' | 'center' | 'right'
  assetId?: string
  metadataField?: 'title' | 'artist' | 'show' | 'listeners'
}

export interface SceneGraph {
  width: number
  height: number
  background: string
  layers: SceneLayer[]
}

export interface Template {
  id: string
  name: string
  provider: Provider
  previewUrl: string
  isCustom: boolean
  customBackgroundRef?: string
  scene?: SceneGraph
  version?: number
  createdAt?: string
  updatedAt?: string
}

export interface TransmissionKit {
  id: string
  destinationId: string
  titleBlock: string
  descriptionBlock: string
  metadata: Record<string, string>
  labels: string[]
  launchNotes: string
}
