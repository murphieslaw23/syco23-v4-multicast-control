import type { IncomingMessage, ServerResponse } from 'node:http'
import type { OutputProfile } from '../../../contracts/domain'
import type { ControlService } from '../../runtime/control-service'
import type { OperationsStore, Role } from '../../runtime/operations'
import { ApiError } from '../../runtime/errors'

export interface ProfileRouteContext {
  actor: string
  role: Role
}

export interface ProfileRouteDependencies {
  request: IncomingMessage
  response: ServerResponse
  url: URL
  context: ProfileRouteContext
  requestId: string
  service: ControlService
  operations: OperationsStore
  readBody: (request: IncomingMessage) => Promise<unknown>
  sendJson: (response: ServerResponse, status: number, data: unknown, requestId?: string) => void
  requireRole: (context: ProfileRouteContext, role: Role) => void
  audited: <T>(
    context: ProfileRouteContext,
    action: string,
    resource: string,
    resourceId: string | null,
    operation: () => Promise<T> | T,
  ) => Promise<T>
}

function parseExpectedVersion(value: string | string[] | undefined): number | null {
  const normalized = Array.isArray(value) ? value[0] : value
  if (!normalized) return null
  const match = normalized.match(/\d+/)
  return match ? Number(match[0]) : null
}

function setProfileEtag(response: ServerResponse, profile: OutputProfile): void {
  response.setHeader('etag', `"${profile.version ?? 1}"`)
}

export async function handleProfileRoutes(deps: ProfileRouteDependencies): Promise<boolean> {
  const { request, response, url, context, requestId, service, operations, readBody, sendJson, requireRole, audited } = deps

  if (request.method === 'GET' && url.pathname === '/api/profiles') {
    sendJson(response, 200, { ok: true, data: service.listProfiles() }, requestId)
    return true
  }

  if (request.method === 'POST' && url.pathname === '/api/profiles') {
    requireRole(context, 'admin')
    const input = (await readBody(request)) as OutputProfile
    const data = await audited(context, 'create', 'profile', input.id || null, () => service.createProfile(input))
    await operations.recordRevision(context.actor, 'profile', data.id, data)
    setProfileEtag(response, data)
    sendJson(response, 201, { ok: true, data }, requestId)
    return true
  }

  const match = url.pathname.match(/^\/api\/profiles\/([^/]+)$/)
  if (!match) return false
  const id = decodeURIComponent(match[1])

  if (request.method === 'GET') {
    const data = service.getProfile(id)
    setProfileEtag(response, data)
    sendJson(response, 200, { ok: true, data }, requestId)
    return true
  }

  if (request.method === 'PATCH') {
    requireRole(context, 'admin')
    const current = service.getProfile(id)
    const expectedVersion = parseExpectedVersion(request.headers['if-match'])
    if (expectedVersion !== null && expectedVersion !== (current.version ?? 1)) {
      throw new ApiError('REVISION_CONFLICT', 'Output profile revision does not match', 409)
    }
    const patch = (await readBody(request)) as Partial<OutputProfile>
    const data = await audited(context, 'update', 'profile', id, () => service.patchProfile(id, patch))
    await operations.recordRevision(context.actor, 'profile', id, data)
    setProfileEtag(response, data)
    sendJson(response, 200, { ok: true, data }, requestId)
    return true
  }

  if (request.method === 'DELETE') {
    requireRole(context, 'admin')
    await audited(context, 'delete', 'profile', id, () => service.removeProfile(id))
    sendJson(response, 204, null, requestId)
    return true
  }

  return false
}
