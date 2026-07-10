import { chmod, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { afterEach, describe, expect, it } from 'vitest'
import { RuntimeEventBus } from '../../server/runtime/event-bus'
import { FfmpegProcessSupervisor } from '../../server/ffmpeg/process-supervisor'

let directory = ''
afterEach(async () => { if (directory) await rm(directory, { recursive: true, force: true }) })

describe('FfmpegProcessSupervisor', () => {
  it('spawns, parses progress, and stops a process', async () => {
    directory = await mkdtemp(join(tmpdir(), 'syco-ffmpeg-'))
    const executable = join(directory, 'fake-ffmpeg.sh')
    await writeFile(executable, '#!/bin/sh\necho "frame=25"\necho "fps=30"\necho "bitrate=4500.0kbits/s"\necho "out_time_ms=1000000"\necho "progress=continue"\nsleep 5\n')
    await chmod(executable, 0o755)
    const events = new RuntimeEventBus()
    const supervisor = new FfmpegProcessSupervisor(events)
    supervisor.start({ executable, args: [], redactedArgs: [], outputCount: 1 })
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(supervisor.snapshot().state).toBe('running')
    expect(supervisor.snapshot().metrics.fps).toBe(30)
    expect(supervisor.snapshot().metrics.bitrateKbps).toBe(4500)
    await supervisor.stop(500)
    expect(supervisor.snapshot().state).toBe('idle')
  })
})
