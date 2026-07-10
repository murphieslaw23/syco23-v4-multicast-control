import type { Provider, TransmissionKit } from './domain'

export interface GenerateTransmissionKitRequest {
  destinationId: string
  templateId?: string
  title?: string
  artist?: string
  show?: string
  publicUrl?: string
}

export interface TransmissionKitListResponse {
  items: TransmissionKit[]
  total: number
}

export interface ProviderContract {
  id: Provider
  label: string
  capabilities: string[]
}
