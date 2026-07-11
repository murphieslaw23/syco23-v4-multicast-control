import { describe, expect, it, vi } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleMetadataRoutes } from '../../server/http/routes/metadata'

type Sent = { status: number; data: unknown; requestId?: string }

function createHarness(method: string, pathname: string) {
  const sent: Sent[] = []
  const requireRole = vi.fn()
  const snapshot = {
    metadata: {
      title: 'Transmission',
      artist: 'SYSTEM CORRUPT',
      show: null,
      artworkUrl: null,
      listeners: 23,
      bitrate: 320,
      codec: 'aac',
    },
    health: {
      configured: true,
      running: true,
      status: 'fresh' as const,
      lastAttemptAt: null,
      lastSuccessAt: '2026-07-11T00:00:00.000Z',
      consecutiveFailures: 0,
      nextPollAt: null,
      lastError: null,
    },
  }
  const stats = {
    samples: 23,
    averageListeners: 10,
    peakListeners: 23,
    averageBitrate: 320,
    firstCapturedAt: null,
    lastCapturedAt: null,
  }
  const refreshed = { ...snapshot.metadata, title: 'Refreshed' }
  const metadata = {
    snapshot: vi.fn(() => snapshot),
    stats: vi.fn(() => stats),
    poll: vi.fn(async () => refreshed),
  }
  return {
    sent,
    requireRole,
    metadata,
    deps: {
      request: { method } as IncomingMessage,
      response: {} as ServerResponse,
      url: new URL(`http://localhost${pathname}`),
      context: { actor: 'operator', role: 'operator' as const },
      requestId: 'request-23',
      metadata,
      sendJson: (_response: ServerResponse, status: number, data: unknown, requestId?: string) => {
        sent.push({ status, data, requestId })
      },
      requireRole,
    },
  }
}

describe('metadata routes', () => {
  it('returns metadata, statistics and health snapshots', async () => {
    for (const path of ['/api/metadata', '/api/metadata/stats', '/api/metadata/health'] as const) {
      const harness = createHarness('GET', path)
      const expected = path === '/api/metadata'
        ? harness.metadata.snapshot()
        : path === '/api/metadata/stats'
          ? harness.metadata.stats()
          : harness.metadata.snapshot().health
      harness.metadata.snapshot.mockClear()
      harness.metadata.stats.mockClear()
      await expect(handleMetadataRoutes(harness.deps)).resolves.toBe(true)
      expect(harness.sent).toEqual([{ status: 200, data: { ok: true, data: expected }, requestId: 'request-23' }])
    }
  })

  it('requires operator access for an immediate refresh', async () => {
    const harness = createHarness('POST', '/api/metadata/refresh')
    await expect(handleMetadataRoutes(harness.deps)).resolves.toBe(true)
    expect(harness.requireRole).toHaveBeenCalledWith(harness.deps.context, 'operator')
    expect(harness.metadata.poll).toHaveBeenCalledOnce()
    expect(harness.sent[0]).toEqual({
      status: 200,
      data: { ok: true, data: expect.objectContaining({ title: 'Refreshed' }) },
      requestId: 'request-23',
    })
  })

  it('does not claim unrelated routes', async () => {
    const harness = createHarness('GET', '/api/status')
    await expect(handleMetadataRoutes(harness.deps)).resolves.toBe(false)
    expect(harness.sent).toEqual([])
  })
})
