import type { UiMode, LayoutState } from '../types/index'

export function detectLayout(): LayoutState {
  if (typeof window === 'undefined') {
    return { mode: 'landscape' }
  }

  const width = window.innerWidth
  const height = window.innerHeight

  if (width >= 1920 && height >= 1080) {
    return { mode: 'tv' }
  }

  if (width > height) {
    return width >= 1024 ? { mode: 'tablet' } : { mode: 'landscape' }
  }

  return { mode: 'portrait' }
}

export function watchLayout(
  getState: (state: LayoutState) => LayoutState,
  onChange: (state: LayoutState) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handler = () => {
    const state = getState(detectLayout())
    onChange(state)
  }

  window.addEventListener('resize', handler)
  return () => window.removeEventListener('resize', handler)
}
