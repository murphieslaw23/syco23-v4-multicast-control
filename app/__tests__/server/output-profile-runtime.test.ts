import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PersistentDatabase } from '../../server/persistent-db'
import { closeDatabase } from '../../server/db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { ControlService } from '../../server/runtime/control-service'
import { resetRuntimeStore } from '../../server/runtime-store'
import type { DestinationState, OutputProfile } from '../../contracts/domain'

let directory = ''
let persistence: PersistentDatabase
let service: ControlService

const profile: OutputProfile = {
  id: 'youtube-1080p30',
  name: 'YouTube 1080p30',
  provider: 'youtube',
  width: 1920,
  height: 1080,
  videoBitrate: 4500,
  audioBitrate: 160,
  fps: 30,
  codec: 'libx264',
}

beforeEach(async () => {
  resetRuntimeStore()
  directory = await mkdtemp(join(tmpdir(), 'syco-profiles-'))
  persistence = new PersistentDatabase(join(directory, 'control.sqlite'))
  service = new ControlService(persistence, new RuntimeEventBus())
  await service.initialize()
})

afterEach(async () => {
  await service.workers.stop()
  closeDatabase()
  await rm(directory, { recursive: true, force: true })
})

describe('output profile runtime', () => {
  it('persists mapped bitrate fields and increments revisions', async () => {
    const created = await service.createProfile(profile)
    expect(created.version).toBe(1)
    expect(created.createdAt).toBeTruthy()

    const updated = await service.patchProfile(profile.id, { videoBitrate: 6000, audioBitrate: 192 })
    expect(updated.version).toBe(2)
    expect(updated.videoBitrate).toBe(6000)
    expect(updated.audioBitrate).toBe(192)

    const persisted = service.getProfile(profile.id)
    expect(persisted).toMatchObject({ videoBitrate: 6000, audioBitrate: 192, version: 2 })
    const columns = persistence.database.exec('SELECT video_bitrate,audio_bitrate,version FROM output_profiles WHERE id=?', [profile.id])[0].values[0]
    expect(columns).toEqual([6000, 192, 2])
  })

  it('rejects invalid provider profiles before persistence', async () => {
    await expect(service.createProfile({ ...profile, id: 'invalid', videoBitrate: 100 })).rejects.toMatchObject({ code: 'PROFILE_INVALID' })
    expect(service.listProfiles()).toHaveLength(0)
  })

  it('prevents deletion while a destination references the profile', async () => {
    await service.createProfile(profile)
    const destination: DestinationState = {
      id: 'youtube-main', provider: 'youtube', label: 'YouTube Main', protocol: 'rtmps',
      endpointUrl: 'rtmps://a.rtmp.youtube.com/live2', streamKeyRef: 'env:YOUTUBE_KEY', status: 'configured',
      health: null, lastHandshakeAt: null, lastError: null, videoProfile: profile.id, audioProfile: profile.id,
      monitorMode: 'rtmp-output', requiresManualPlatformSetup: true, capabilities: [], transmissionKitId: null, notes: '',
    }
    await service.createDestination(destination)
    await expect(service.removeProfile(profile.id)).rejects.toMatchObject({ code: 'PROFILE_IN_USE' })
  })
})
