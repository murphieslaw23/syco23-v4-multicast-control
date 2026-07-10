import { afterEach, describe, expect, it } from 'vitest'
import { chmod, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { HlsPreviewRuntime } from '../../server/runtime/hls-preview-runtime'
import { PreviewTicketStore } from '../../server/runtime/preview-tickets'

const runtimes: HlsPreviewRuntime[] = []
afterEach(async () => {
  await Promise.allSettled(runtimes.splice(0).map((runtime) => runtime.stop(200)))
})

describe('HLS preview runtime', () => {
  it('creates and tracks a rolling playlist through a real child process', async () => {
    const root = await mkdtemp(join(tmpdir(), 'syco-preview-'))
    const fake = join(root, 'fake-ffmpeg.mjs')
    await writeFile(fake, `#!/usr/bin/env node
import { writeFileSync } from 'node:fs'
const playlist = process.argv.at(-1)
const segmentPattern = process.argv[process.argv.indexOf('-hls_segment_filename') + 1]
const segment = segmentPattern.replace('%06d', '000001')
writeFileSync(segment, Buffer.from('segment'))
writeFileSync(playlist, '#EXTM3U\\n#EXT-X-TARGETDURATION:2\\n#EXTINF:2,\\nsegment-000001.ts\\n')
setInterval(() => {}, 1000)
`)
    await chmod(fake, 0o755)
    const runtime = new HlsPreviewRuntime(new RuntimeEventBus(), { rootDir: join(root, 'out'), ffmpegPath: fake })
    runtimes.push(runtime)
    await runtime.start('file:/tmp/input.mp4')
    await new Promise((resolve) => setTimeout(resolve, 1200))
    const snapshot = runtime.snapshot()
    expect(snapshot.state).toBe('running')
    expect(snapshot.playlistReady).toBe(true)
    expect(snapshot.segmentCount).toBe(1)
    expect(await readFile(join(root, 'out/index.m3u8'), 'utf8')).toContain('segment-000001.ts')
    await runtime.stop(500)
    expect(runtime.snapshot().state).toBe('idle')
  })

  it('rejects unsupported input protocols', async () => {
    const root = await mkdtemp(join(tmpdir(), 'syco-preview-'))
    const runtime = new HlsPreviewRuntime(new RuntimeEventBus(), { rootDir: root })
    await expect(runtime.start('javascript:alert(1)')).rejects.toThrow('Unsupported preview input protocol')
  })
})

describe('preview tickets', () => {
  it('issues reusable short-lived tickets and supports revocation', () => {
    const store = new PreviewTicketStore()
    const issued = store.issue('viewer', 10_000)
    expect(store.validate(issued.ticket)?.role).toBe('viewer')
    expect(store.validate(issued.ticket)?.role).toBe('viewer')
    store.revoke(issued.ticket)
    expect(store.validate(issued.ticket)).toBeNull()
  })
})
