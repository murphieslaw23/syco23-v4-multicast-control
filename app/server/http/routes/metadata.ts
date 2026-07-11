import type { IncomingMessage, ServerResponse } from 'node:http'
import type { MetadataRuntime } from '../../runtime/metadata-runtime'
import type { Role } from '../../runtime/operations'

export interface MetadataRouteContext {
  actor: string
  role: Role
}

export interface MetadataRouteDependencies {
  request: IncomingMessage
  response: ServerResponse
  url: URL
  context: MetadataRouteContext
  requestId: string
  metadata: Pick<MetadataRuntime, 'snapshot' | 'stats' | 'poll'>
  sendJson: (response: ServerResponse, status: number, data: unknown, requestId?: string) => void
  requireRole: (context: MetadataRouteContext, role: Role) => void
}

export async function handleMetadataRoutes(deps: MetadataRouteDependencies): Promise<boolean> {
  const { request, response, url, context, requestId, metadata, sendJson, requireRole } = deps

  if (request.method === 'GET' && url.pathname === '/api/metadata') {
    sendJson(response, 200, { ok: true, data: metadata.snapshot() }, requestId)
    return true
  }

  if (request.method === 'GET' && url.pathname === '/api/metadata/stats') {
    sendJson(response, 200, { ok: true, data: metadata.stats() }, requestId)
    return true
  }

  if (request.method === 'GET' && url.pathname === '/api/metadata/health') {
    sendJson(response, 200, { ok: true, data: metadata.snapshot().health }, requestId)
    return true
  }

  if (request.method === 'POST' && url.pathname === '/api/metadata/refresh') {
    requireRole(context, 'operator')
    sendJson(response, 200, { ok: true, data: await metadata.poll() }, requestId)
    return true
  }

  return false
}
