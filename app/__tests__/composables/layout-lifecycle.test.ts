import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import type { PropType } from 'vue'
import type { UseSycoLayoutReturn } from '../../composables/useSycoLayout'

type LayoutComposable = () => UseSycoLayoutReturn

function createTestComponent() {
  return {
    template: '<div :class="mode">{{ mode }}</div>',
    props: {
      composable: {
        type: Function as PropType<LayoutComposable>,
        required: true,
      },
    },
    setup(props: { composable: LayoutComposable }) {
      return props.composable()
    },
  }
}

describe('composables/useSycoLayout full lifecycle', () => {
  it('mounts and unmounts without error', async () => {
    const { useSycoLayout } = await import('../../composables/useSycoLayout')
    const wrapper = mount(createTestComponent(), {
      props: { composable: useSycoLayout },
    })
    expect(wrapper.vm.mode).toBeDefined()
    expect(['portrait', 'landscape', 'tablet', 'tv']).toContain(wrapper.vm.mode)
    wrapper.unmount()
  })

  it('updates mode on resize', async () => {
    const { useSycoLayout } = await import('../../composables/useSycoLayout')
    Object.defineProperty(window, 'innerWidth', { value: 800, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true })

    const wrapper = mount(createTestComponent(), {
      props: { composable: useSycoLayout },
    })

    expect(wrapper.vm.mode).toBe('landscape')

    Object.defineProperty(window, 'innerWidth', { value: 1920, configurable: true })
    Object.defineProperty(window, 'innerHeight', { value: 1080, configurable: true })
    window.dispatchEvent(new Event('resize'))
    await wrapper.vm.$nextTick()

    expect(wrapper.vm.mode).toBe('tv')
    wrapper.unmount()
  })
})
