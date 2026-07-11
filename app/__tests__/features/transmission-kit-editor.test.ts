import { describe, it, expect, vi, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import type { TransmissionKit } from '../../contracts/domain'

const kit:TransmissionKit = {
  id:'kit-1',destinationId:'dest-1',titleBlock:'Original title',descriptionBlock:'Description',metadata:{provider:'youtube'},labels:['youtube','syco23'],launchNotes:'Check preview',
  checklist:[{id:'provider-preview',label:'Verify preview',required:true,completed:false}],version:2,
}

describe('TransmissionKitEditor', () => {
  afterEach(()=>vi.restoreAllMocks())

  it('emits edited copy and persisted checklist progress', async () => {
    const component = await import('../../components/TransmissionKitEditor.vue')
    const wrapper = mount(component.default,{props:{kit}})
    await wrapper.get('[data-testid="kit-title"]').setValue('Updated title')
    await wrapper.get('[data-testid="check-provider-preview"]').setValue(true)
    await wrapper.get('[data-testid="save-kit"]').trigger('click')
    const patch = wrapper.emitted('save')?.[0]?.[0] as Partial<TransmissionKit>
    expect(patch.titleBlock).toBe('Updated title')
    expect(patch.checklist?.[0]).toMatchObject({id:'provider-preview',completed:true})
  })

  it('copies provider copy to the clipboard', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}})
    const component = await import('../../components/TransmissionKitEditor.vue')
    const wrapper = mount(component.default,{props:{kit}})
    await wrapper.get('[data-testid="copy-description"]').trigger('click')
    expect(writeText).toHaveBeenCalledWith('Description')
  })
})
