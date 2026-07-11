import type { ServerResponse } from 'node:http'

export function parseExpectedVersion(value: string | string[] | undefined): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  if (!normalized) return null
  const match = normalized.match(/\d+/)
  return match ? Number(match[0]) : null
}

export function setVersionEtag(response: ServerResponse, version?: number): void {
  response.setHeader('etag', `"${version ?? 1}"`)
}
