import { describe, expect, it } from 'vitest'
import { generateKit } from '../../server/dao/transmissionKits'

describe('provider transmission kits', () => {
  it('generates provider and template-specific launch copy', () => {
    const kit = generateKit({
      destinationId: 'youtube-main',
      destinationLabel: 'YouTube Main',
      provider: 'youtube',
      template: { id: 'scene-1', name: 'Signal Grid', provider: 'youtube' },
      title: 'Friday Transmission',
      artist: 'Murphies Law',
      publicUrl: 'https://syco23.org/live',
    })

    expect(kit.destinationId).toBe('youtube-main')
    expect(kit.titleBlock).toContain('Friday Transmission')
    expect(kit.descriptionBlock).toContain('Signal Grid')
    expect(kit.descriptionBlock).toContain('https://syco23.org/live')
    expect(kit.labels).toEqual(expect.arrayContaining(['youtube', 'syco23']))
    expect(kit.launchNotes).toContain('YouTube')
    expect(kit.metadata.templateId).toBe('scene-1')
  })

  it('uses safe defaults without metadata', () => {
    const kit = generateKit({ destinationId: 'custom', provider: 'custom-rtmp' })
    expect(kit.titleBlock).toContain('SYSTEM CORRUPT')
    expect(kit.launchNotes).toContain('RTMP')
  })
})
