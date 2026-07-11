import { describe, it, expect, beforeEach } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
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

describe('components/DestinationMatrix — local provider', () => {
  beforeEach(() => {
    updateSycoAppState({ destinations: [] })
  })

  it('shows SELF badge for local provider destination', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Self Cast', status: 'configured' }),
      ],
    })
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-dest-local-badge').exists()).toBe(true)
    expect(wrapper.find('.syco-dest-local-badge').text()).toBe('SELF')
  })

  it('does not show SELF badge for non-local provider', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'yt-1', provider: 'youtube', label: 'YT Main', status: 'live' }),
      ],
    })
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-dest-local-badge').exists()).toBe(false)
  })

  it('local provider appears in the provider dropdown', async () => {
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    await wrapper.find('.syco-btn-sm').trigger('click')
    const options = wrapper.findAll('.syco-input option')
    const optionTexts = options.map((o) => o.text())
    expect(optionTexts).toContain('local')
  })

  it('local provider is first option in dropdown', async () => {
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    await wrapper.find('.syco-btn-sm').trigger('click')
    const options = wrapper.findAll('.syco-input option')
    expect(options.at(0)!.text()).toBe('local')
  })

  it('local provider status cycles like other providers', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Self Cast', status: 'configured' }),
      ],
    })
    const mod = await import('../../components/DestinationMatrix.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })

    const statusEl = wrapper.find('.syco-dest-status')
    expect(statusEl.text()).toBe('configured')

    // configured → armed
    await statusEl.trigger('click')
    await flushPromises()
    expect(statusEl.text()).toBe('armed')

    // armed → connecting
    await statusEl.trigger('click')
    await flushPromises()
    expect(statusEl.text()).toBe('connecting')

    // connecting → live
    await statusEl.trigger('click')
    await flushPromises()
    expect(statusEl.text()).toBe('live')

    // live → idle
    await statusEl.trigger('click')
    await flushPromises()
    expect(statusEl.text()).toBe('idle')
  })
})

describe('components/SycoVideoPlayer — self-cast', () => {
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

  it('shows NO SIGNAL when no local destination is live', async () => {
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player-signal').text()).toBe('NO SIGNAL')
    expect(wrapper.find('.syco-player-indicator').exists()).toBe(false)
  })

  it('shows SELF CAST when local destination is live', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Cam 1', status: 'live' }),
      ],
    })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player-indicator').text()).toBe('SELF CAST')
    expect(wrapper.find('.syco-player-dest').text()).toBe('Cam 1')
  })

  it('shows destination label in self-cast indicator', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-2', provider: 'local', label: 'Studio Feed', status: 'live' }),
      ],
    })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player-dest').text()).toBe('Studio Feed')
  })

  it('does not show SELF CAST when local destination is configured (not live)', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Cam 1', status: 'configured' }),
      ],
    })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player-signal').text()).toBe('NO SIGNAL')
  })

  it('does not show SELF CAST when local destination is in failed state', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Cam 1', status: 'failed' }),
      ],
    })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player-signal').text()).toBe('NO SIGNAL')
  })

  it('applies active class to player when self-casting', async () => {
    updateSycoAppState({
      destinations: [
        makeDestination({ id: 'local-1', provider: 'local', label: 'Cam 1', status: 'live' }),
      ],
    })
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player').classes()).toContain('syco-player--active')
  })

  it('does not apply active class when no self-cast', async () => {
    const mod = await import('../../components/SycoVideoPlayer.vue')
    const wrapper = mount(mod.default, { props: { api: createDestinationApi() } })
    expect(wrapper.find('.syco-player').classes()).not.toContain('syco-player--active')
  })
})
