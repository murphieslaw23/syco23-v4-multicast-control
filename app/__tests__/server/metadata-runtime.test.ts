import { afterEach, describe, expect, it, vi } from 'vitest'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { PersistentDatabase } from '../../server/persistent-db'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { MetadataRuntime } from '../../server/runtime/metadata-runtime'

const dirs: string[] = []
afterEach(async () => {
  vi.unstubAllGlobals()
  await Promise.all(dirs.splice(0).map(dir => rm(dir,{recursive:true,force:true})))
})

async function fixture() {
  const dir = await mkdtemp(join(tmpdir(),'syco-meta-'))
  dirs.push(dir)
  const db = new PersistentDatabase(join(dir,'db.sqlite'))
  await db.open()
  await db.transaction(database => database.run('DELETE FROM metadata_snapshots'))
  const events = new RuntimeEventBus()
  const runtime = new MetadataRuntime(db, events, { baseUrl:'https://radio.example', station:'syco23', pollIntervalMs:1000, timeoutMs:1000, staleAfterMs:5000, maxBackoffMs:10000 })
  await runtime.initialize()
  return { db, runtime, events }
}

describe('MetadataRuntime', () => {
  it('normalizes and persists AzuraCast metadata', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      station:{name:'SYSTEM CORRUPT'}, listeners:{current:23}, live:{streamer_name:'MURPHIES LAW'},
      now_playing:{song:{title:'Signal',artist:'SYCO23',art:'/art.jpg'}}, station_mounts:[{bitrate:192,format:'mp3'}],
    }), {status:200,headers:{'content-type':'application/json'}})))
    const { db, runtime } = await fixture()
    const data = await runtime.poll()
    expect(data).toEqual({ title:'Signal', artist:'SYCO23', show:'MURPHIES LAW', artworkUrl:'https://radio.example/art.jpg', listeners:23, bitrate:192, codec:'mp3' })
    expect(runtime.snapshot().health.status).toBe('fresh')
    expect(runtime.stats()).toMatchObject({ samples:1, peakListeners:23, averageBitrate:192 })
    expect(db.database.exec('SELECT COUNT(*) FROM metadata_snapshots')[0].values[0][0]).toBe(1)
  })

  it('retains the latest snapshot and reports failures without throwing', async () => {
    const { runtime } = await fixture()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const data = await runtime.poll()
    expect(data.title).toBe('')
    expect(runtime.snapshot().health).toMatchObject({ consecutiveFailures:1, lastError:'offline' })
  })

  it('is disabled when AzuraCast is not configured', async () => {
    const dir = await mkdtemp(join(tmpdir(),'syco-meta-disabled-')); dirs.push(dir)
    const db = new PersistentDatabase(join(dir,'db.sqlite')); await db.open()
    const runtime = new MetadataRuntime(db,new RuntimeEventBus(),{baseUrl:'',station:'',pollIntervalMs:1000,timeoutMs:1000,staleAfterMs:5000,maxBackoffMs:10000})
    expect(runtime.snapshot().health.status).toBe('disabled')
    await expect(runtime.poll()).resolves.toMatchObject({ title:'' })
  })
})
