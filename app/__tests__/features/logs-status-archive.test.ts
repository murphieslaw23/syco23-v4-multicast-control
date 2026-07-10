import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { updateSycoAppState } from '../../composables/store'

describe('components/LogViewer', () => {
  beforeEach(() => {
    updateSycoAppState({
      live: false,
      sessionId: null,
      uptime: null,
      streamStatus: 'offline',
      sourceUrl: null,
      ingestStatus: 'idle',
      title: '',
      artist: '',
      destinations: [],
      pipelineHealth: 'ok',
      uiMode: 'landscape',
      collapsedNav: false,
    })
  })

  it('renders without error', async () => {
    const mod = await import('../../components/LogViewer.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-logs').exists()).toBe(true)
  })

  it('shows empty state when no logs', async () => {
    const mod = await import('../../components/LogViewer.vue')
    const wrapper = mount(mod.default)
    expect(wrapper.find('.syco-empty').text()).toContain('No log entries')
  })

  it('renders filter buttons for all levels', async () => {
    const mod = await import('../../components/LogViewer.vue')
    const wrapper = mount(mod.default)
    const filters = wrapper.findAll('.syco-filter-btn')
    expect(filters.length).toBe(6)
  })

  it('shows status grid with ingest, pipeline, and stream info', async () => {
    const mod = await import('../../components/LogViewer.vue')
    const wrapper = mount(mod.default)
    const statusItems = wrapper.findAll('.syco-status-item')
    expect(statusItems.length).toBe(3)
  })

  it('TEST button adds a log entry', async () => {
    const mod = await import('../../components/LogViewer.vue')
    const wrapper = mount(mod.default)
    await wrapper.find('.syco-log-actions .syco-btn-sm').trigger('click')
    expect(wrapper.findAll('.syco-log-entry').length).toBe(1)
  })
})
