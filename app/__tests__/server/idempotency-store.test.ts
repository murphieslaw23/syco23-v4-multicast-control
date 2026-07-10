import { describe, expect, it, vi } from 'vitest'
import { IdempotencyStore } from '../../server/runtime/idempotency-store'

describe('IdempotencyStore', () => {
  it('returns a cached command result within the TTL', () => {
    const store = new IdempotencyStore(1000)
    store.set('pipeline.start', 'key', { state: 'running' })
    expect(store.get('pipeline.start', 'key')).toEqual({ state: 'running' })
  })

  it('expires old command results', () => {
    vi.useFakeTimers()
    const store = new IdempotencyStore(1000)
    store.set('pipeline.stop', 'key', { state: 'idle' })
    vi.advanceTimersByTime(1001)
    expect(store.get('pipeline.stop', 'key')).toBeNull()
    vi.useRealTimers()
  })
})
