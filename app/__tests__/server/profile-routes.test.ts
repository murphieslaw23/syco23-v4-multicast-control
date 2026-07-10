import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleProfileRoutes } from '../../server/http/routes/profiles'
import type { OutputProfile } from '../../contracts/domain'

const profile: OutputProfile = {
  id: 'p1', name: 'YouTube 1080p', provider: 'youtube', width: 1920, height: 1080,
  videoBitrate: 4500, audioBitrate: 160, fps: 30, codec: 'libx264', version: 3,
}

function responseMock() {
  const headers = new Map<string, string>()
  return {
    headers,
    response: { setHeader: (name: string, value: string) => headers.set(name.toLowerCase(), String(value)) } as unknown as ServerResponse,
  }
}

describe('profile route module', () => {
  it('returns an ETag for a single profile', async () => {
    const { response, headers } = responseMock()
    const sendJson = vi.fn()
    const handled = await handleProfileRoutes({
      request: { method: 'GET', headers: {} } as IncomingMessage,
      response,
      url: new URL('http://localhost/api/profiles/p1'),
      context: { actor: 'admin', role: 'admin' },
      requestId: 'req-1',
      service: { getProfile: () => profile } as never,
      operations: {} as never,
      readBody: async () => ({}),
      sendJson,
      requireRole: vi.fn(),
      audited: async (_context, _action, _resource, _id, operation) => operation(),
    })
    expect(handled).toBe(true)
    expect(headers.get('etag')).toBe('"3"')
    expect(sendJson).toHaveBeenCalledWith(response, 200, { ok: true, data: profile }, 'req-1')
  })

  it('rejects stale If-Match revisions before mutation', async () => {
    const { response } = responseMock()
    const patchProfile = vi.fn()
    await expect(handleProfileRoutes({
      request: { method: 'PATCH', headers: { 'if-match': '"2"' } } as IncomingMessage,
      response,
      url: new URL('http://localhost/api/profiles/p1'),
      context: { actor: 'admin', role: 'admin' },
      requestId: 'req-2',
      service: { getProfile: () => profile, patchProfile } as never,
      operations: {} as never,
      readBody: async () => ({ name: 'Changed' }),
      sendJson: vi.fn(),
      requireRole: vi.fn(),
      audited: async (_context, _action, _resource, _id, operation) => operation(),
    })).rejects.toMatchObject({ code: 'REVISION_CONFLICT', status: 409 })
    expect(patchProfile).not.toHaveBeenCalled()
  })
})
