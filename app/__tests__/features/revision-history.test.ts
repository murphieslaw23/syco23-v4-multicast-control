import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { runtimeApi } from '../../services/runtime-api'

const revisions = [
  { id:'r2',revision:2,actor:'admin',createdAt:'2026-07-11T00:01:00Z',snapshot:{id:'dest-1',label:'New',notes:'changed',version:2} },
  { id:'r1',revision:1,actor:'admin',createdAt:'2026-07-11T00:00:00Z',snapshot:{id:'dest-1',label:'Old',notes:'original',version:1} },
]

describe('RevisionHistoryPanel', () => {
  beforeEach(() => {
    vi.spyOn(runtimeApi,'destinations').mockResolvedValue([{id:'dest-1',label:'Main',provider:'youtube',protocol:'rtmps',endpointUrl:'x',streamKeyRef:'env:X',status:'configured',health:null,lastHandshakeAt:null,lastError:null,videoProfile:'p',audioProfile:'p',monitorMode:'rtmp-output',requiresManualPlatformSetup:false,capabilities:[],transmissionKitId:null,notes:'',version:2}])
    vi.spyOn(runtimeApi,'revisions').mockResolvedValue(revisions)
    vi.spyOn(runtimeApi,'restoreRevision').mockResolvedValue({id:'dest-1',version:3})
    vi.spyOn(window,'confirm').mockReturnValue(true)
  })
  afterEach(()=>vi.restoreAllMocks())

  it('compares changed fields between configuration revisions', async () => {
    const component = await import('../../components/RevisionHistoryPanel.vue')
    const wrapper = mount(component.default)
    await flushPromises()
    expect(wrapper.get('[data-testid="revision-diff"]').text()).toContain('label')
    expect(wrapper.get('[data-testid="revision-diff"]').text()).toContain('notes')
  })

  it('restores using the current resource version', async () => {
    const component = await import('../../components/RevisionHistoryPanel.vue')
    const wrapper = mount(component.default)
    await flushPromises()
    await wrapper.get('[data-testid="restore-revision"]').setValue('1')
    await wrapper.get('[data-testid="restore-button"]').trigger('click')
    await flushPromises()
    expect(runtimeApi.restoreRevision).toHaveBeenCalledWith('destination','dest-1',1,2)
  })
})
