import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { updateSycoAppState } from '../../composables/store'

describe('components/TemplateGallery', () => {
  beforeEach(() => {
    updateSycoAppState({ destinations: [] })
  })

  it('renders without error', async () => {
    const mod = await import('../../components/TemplateGallery.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-templates').exists()).toBe(true)
  })

  it('shows built-in templates', async () => {
    const mod = await import('../../components/TemplateGallery.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.findAll('.syco-template-card').length).toBeGreaterThan(0)
  })

  it('shows builder when BUILD is clicked', async () => {
    const mod = await import('../../components/TemplateGallery.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-builder').exists()).toBe(false)
    await wrapper.find('.syco-btn-sm').trigger('click')
    expect(wrapper.find('.syco-builder').exists()).toBe(true)
  })

  it('renders filter buttons for all providers', async () => {
    const mod = await import('../../components/TemplateGallery.vue')
    const wrapper = mount(mod.default)
    const filters = wrapper.findAll('.syco-filter-btn')
    expect(filters.length).toBeGreaterThan(1)
  })
})

describe('components/SycoVideoPlayer', () => {
  beforeEach(() => {
    updateSycoAppState({ live: false, ingestStatus: 'idle' })
  })

  it('renders without error', async () => {
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-player').exists()).toBe(true)
  })

  it('shows NO SIGNAL when not playing', async () => {
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-player-signal').text()).toBe('NO SIGNAL')
  })

  it('shows LIVE PREVIEW when playing', async () => {
    updateSycoAppState({ live: true, ingestStatus: 'connected' })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-player-indicator').text()).toBe('LIVE PREVIEW')
  })
})
