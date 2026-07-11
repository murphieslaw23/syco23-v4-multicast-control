import type { LayoutState } from '../types/index'

export interface ViewportDimensions {
  innerWidth: number
  innerHeight: number
}

export function detectLayout(viewport: ViewportDimensions | null = typeof window === 'undefined' ? null : window): LayoutState {
  if (!viewport) return { mode: 'landscape' }

  const width = viewport.innerWidth
  const height = viewport.innerHeight

  if (width >= 1920 && height >= 1080) return { mode: 'tv' }
  if (width > height) return width >= 1024 ? { mode: 'tablet' } : { mode: 'landscape' }
  return { mode: 'portrait' }
}

export function watchLayout(
  getState: (state: LayoutState) => LayoutState,
  onChange: (state: LayoutState) => void,
  target: Window | null = typeof window === 'undefined' ? null : window,
): () => void {
  if (!target) return () => {}
  const handler = () => onChange(getState(detectLayout(target)))
  target.addEventListener('resize', handler)
  return () => target.removeEventListener('resize', handler)
}
