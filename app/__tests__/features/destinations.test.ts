import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { updateSycoAppState } from '../../composables/store'
import type { DestinationState } from '../../types/index'
import { createDestinationApi } from '../helpers/destination-api'

const makeDestination = (overrides: Partial<DestinationState> = {}): DestinationState => ({
  id: 'dest-1',
  provider: 'youtube',
  label: 'YouTube Main',
  protocol: 'rtmps',
  endpointUrl: 'rtmp://a.rtmp.youtube.com/live2',
  streamKeyRef: 'ref-1',
  status: 'idle',
  health: null,
  lastHandshakeAt: null,
  lastError: null,
  videoProfile: '1080p',
  audioProfile: '128k',
  monitorMode: 'rtmp-output',
  requiresManualPlatformSetup: false,
  capabilities: [],
  transmissionKitId: null,
  notes: '',
  ...overrides,
})

describe('components/LiveControl', () => {
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

  it('renders without error', () => {
    return import('../../components/LiveControl.vue').then((mod) => {
      const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
      expect(wrapper.find('.syco-live').exists()).toBe(true)
    })
  })

  it('shows OFFLINE status when not live', async () => {
    const mod = await import('../../components/LiveControl.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-status-badge').text()).toBe('OFFLINE')
  })

  it('shows pipeline health badge', async () => {
    updateSycoAppState({ pipelineHealth: 'degraded' })
    const mod = await import('../../components/LiveControl.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-badge').text()).toBe('degraded')
  })
})

describe('components/DestinationMatrix', () => {
  beforeEach(() => {
    updateSycoAppState({ destinations: [] })
  })

  it('renders without error', () => {
    return import('../../components/DestinationMatrix.vue').then((mod) => {
      const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
      expect(wrapper.find('.syco-destinations').exists()).toBe(true)
    })
  })

  it('shows empty state when no destinations', async () => {
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-empty').text()).toContain('No destinations')
  })

  it('shows destinations when present', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'a', label: 'YT', status: 'live' }),
        makeDestination({ id: 'b', label: 'TG', status: 'configured' }),
      ],
    })
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.findAll('.syco-dest-card')).toHaveLength(2)
  })

  it('hides form by default', async () => {
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-form').exists()).toBe(false)
  })

  it('shows form when ADD is clicked', async () => {
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    await wrapper.find('.syco-btn-sm').trigger('click')
    expect(wrapper.find('.syco-form').exists()).toBe(true)
  })
})
