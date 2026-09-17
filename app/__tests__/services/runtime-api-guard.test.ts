import { describe, expect, it, vi, afterEach } from 'vitest'
import { runtimeApi } from '../../services/runtime-api'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('runtime-api response guard', () => {
  it('rejects HTML proxy bodies with NON_JSON_RESPONSE instead of SyntaxError', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<!doctype html><html></html>', {
        status: 200,
        headers: { 'content-type': 'text/html' },
      })),
    )
    const failure = await runtimeApi.status().then(
      () => null,
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(Error)
    expect((failure as Error & { code?: string }).code).toBe('NON_JSON_RESPONSE')
    expect((failure as Error).message).toContain('HTTP 200')
  })

  it('still resolves valid JSON envelopes', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(
        JSON.stringify({ ok: true, data: { live: false } }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      )),
    )
    await expect(runtimeApi.status()).resolves.toMatchObject({ live: false })
  })
});
