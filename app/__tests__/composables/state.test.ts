import { describe, it, expect, beforeEach } from 'vitest'
import { updateSycoAppState } from '../../composables/store'

describe('composables/useSycoUiState', () => {
  beforeEach(() => {
    updateSycoAppState({ live: false, sessionId: null })
  })

  it('initializes with default state', async () => {
    const { useSycoUiState } = await import('../../composables/useSycoUiState')
    const { state } = useSycoUiState()
    expect(state.live).toBe(false)
    expect(state.sessionId).toBeNull()
  })

  it('allows mutating state via store', async () => {
    const { useSycoUiState } = await import('../../composables/useSycoUiState')
    const { state } = useSycoUiState()
    updateSycoAppState({ live: true, sessionId: 'abc-123' })
    expect(state.live).toBe(true)
    expect(state.sessionId).toBe('abc-123')
  })

  it('supports setSycoAppState to replace all fields', async () => {
    const { setSycoAppState } = await import('../../composables/store')
    setSycoAppState({
      live: true,
      sessionId: 'full-replace',
      uptime: '00:05:00',
      streamStatus: 'online',
      sourceUrl: 'rtmp://x',
      ingestStatus: 'connected',
      title: 'Test',
      artist: 'Artist',
      destinations: [],
      pipelineHealth: 'ok',
      uiMode: 'landscape',
      collapsedNav: true,
    })
    const { useSycoUiState } = await import('../../composables/useSycoUiState')
    const { state } = useSycoUiState()
    expect(state.title).toBe('Test')
    expect(state.collapsedNav).toBe(true)
  })

  it('derived title composable returns computed', async () => {
    const { useDerivedTitle } = await import('../../composables/useSycoUiState')
    updateSycoAppState({ title: 'My Show', artist: 'DJ X' })
    const title = useDerivedTitle()
    expect(title.value).toBe('DJ X — My Show')
  })

  it('derived title returns title only when no artist', async () => {
    const { useDerivedTitle } = await import('../../composables/useSycoUiState')
    updateSycoAppState({ title: 'Solo Show', artist: '' })
    const title = useDerivedTitle()
    expect(title.value).toBe('Solo Show')
  })

  it('derived title returns NO METADATA when empty', async () => {
    const { useDerivedTitle } = await import('../../composables/useSycoUiState')
    updateSycoAppState({ title: '', artist: '' })
    const title = useDerivedTitle()
    expect(title.value).toBe('NO METADATA')
  })

  it('derived title returns artist only when no title', async () => {
    const { useDerivedTitle } = await import('../../composables/useSycoUiState')
    updateSycoAppState({ title: '', artist: 'DJ Solo' })
    const title = useDerivedTitle()
    expect(title.value).toBe('DJ Solo')
  })
})
