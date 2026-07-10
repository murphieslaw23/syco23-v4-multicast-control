import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { mkdir, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { RuntimeEventBus } from './event-bus'

export type PreviewState = 'idle' | 'starting' | 'running' | 'stopping' | 'failed'

export interface PreviewSnapshot {
  state: PreviewState
  pid: number | null
  startedAt: string | null
  lastSegmentAt: string | null
  playlistReady: boolean
  segmentCount: number
  lastError: string | null
}

export interface HlsPreviewConfig {
  rootDir: string
  ffmpegPath?: string
  width?: number
  height?: number
  fps?: number
  videoBitrateKbps?: number
  audioBitrateKbps?: number
  segmentSeconds?: number
  listSize?: number
}

export class HlsPreviewRuntime {
  readonly rootDir: string
  private process: ChildProcessByStdio<null, Readable, Readable> | null = null
  private state: PreviewState = 'idle'
  private startedAt: string | null = null
  private lastSegmentAt: string | null = null
  private segmentCount = 0
  private playlistReady = false
  private lastError: string | null = null
  private monitor: NodeJS.Timeout | null = null
  private stopping = false

  constructor(
    private readonly events: RuntimeEventBus,
    private readonly config: HlsPreviewConfig,
  ) {
    this.rootDir = resolve(config.rootDir)
  }

  snapshot(): PreviewSnapshot {
    return {
      state: this.state,
      pid: this.process?.pid ?? null,
      startedAt: this.startedAt,
      lastSegmentAt: this.lastSegmentAt,
      playlistReady: this.playlistReady,
      segmentCount: this.segmentCount,
      lastError: this.lastError,
    }
  }

  async start(inputUrl: string): Promise<PreviewSnapshot> {
    if (this.process) throw new Error('HLS preview is already active')
    if (!/^(https?|rtmps?|srt|udp|tcp|file):/i.test(inputUrl)) {
      throw new Error('Unsupported preview input protocol')
    }
    await this.prepareDirectory()
    this.state = 'starting'
    this.stopping = false
    this.startedAt = new Date().toISOString()
    this.lastSegmentAt = null
    this.segmentCount = 0
    this.playlistReady = false
    this.lastError = null

    const width = this.config.width ?? 1280
    const height = this.config.height ?? 720
    const fps = this.config.fps ?? 25
    const segmentSeconds = this.config.segmentSeconds ?? 2
    const listSize = this.config.listSize ?? 6
    const playlist = join(this.rootDir, 'index.m3u8')
    const segments = join(this.rootDir, 'segment-%06d.ts')
    const args = [
      '-hide_banner', '-nostdin', '-loglevel', 'warning',
      ...(inputUrl.startsWith('http') ? ['-reconnect', '1', '-reconnect_streamed', '1', '-reconnect_delay_max', '5'] : []),
      '-i', inputUrl,
      '-map', '0:v:0?', '-map', '0:a:0?',
      '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
      '-pix_fmt', 'yuv420p', '-r', String(fps),
      '-vf', `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`,
      '-b:v', `${this.config.videoBitrateKbps ?? 1800}k`,
      '-maxrate', `${this.config.videoBitrateKbps ?? 1800}k`,
      '-bufsize', `${(this.config.videoBitrateKbps ?? 1800) * 2}k`,
      '-g', String(fps * segmentSeconds), '-keyint_min', String(fps * segmentSeconds), '-sc_threshold', '0',
      '-c:a', 'aac', '-b:a', `${this.config.audioBitrateKbps ?? 128}k`, '-ar', '48000',
      '-f', 'hls', '-hls_time', String(segmentSeconds), '-hls_list_size', String(listSize),
      '-hls_flags', 'delete_segments+append_list+independent_segments+program_date_time',
      '-hls_segment_filename', segments, playlist,
    ]
    const child = spawn(this.config.ffmpegPath || 'ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    this.process = child
    child.once('spawn', () => {
      this.state = 'running'
      this.events.publish('preview.started', { pid: child.pid, playlist: '/api/preview/index.m3u8' })
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      const message = chunk.trim()
      if (message) this.events.publish('preview.stderr', { message: message.slice(-2000) })
    })
    child.once('error', (error) => this.fail(error))
    child.once('exit', (code, signal) => {
      this.process = null
      this.stopMonitor()
      if (this.stopping) {
        this.state = 'idle'
        this.events.publish('preview.stopped', { code, signal })
      } else if (code !== 0) {
        this.fail(new Error(`Preview FFmpeg exited with code ${code ?? 'null'} (${signal ?? 'no signal'})`))
      } else {
        this.state = 'idle'
        this.events.publish('preview.completed', { code, signal })
      }
    })
    this.monitor = setInterval(() => void this.scanArtifacts(), 1000)
    this.monitor.unref?.()
    return this.snapshot()
  }

  async stop(graceMs = 5000): Promise<PreviewSnapshot> {
    const child = this.process
    if (!child) {
      this.state = 'idle'
      return this.snapshot()
    }
    this.stopping = true
    this.state = 'stopping'
    child.kill('SIGTERM')
    await new Promise<void>((resolveDone) => {
      const timer = setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL')
        resolveDone()
      }, graceMs)
      child.once('exit', () => {
        clearTimeout(timer)
        resolveDone()
      })
    })
    return this.snapshot()
  }

  async cleanup(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
    for (const entry of await readdir(this.rootDir)) {
      if (entry === 'index.m3u8' || /^segment-\d+\.ts$/.test(entry)) {
        await rm(join(this.rootDir, entry), { force: true })
      }
    }
    this.playlistReady = false
    this.segmentCount = 0
    this.lastSegmentAt = null
  }

  private async prepareDirectory(): Promise<void> {
    await mkdir(this.rootDir, { recursive: true })
    await this.cleanup()
  }

  private async scanArtifacts(): Promise<void> {
    try {
      const entries = await readdir(this.rootDir)
      this.playlistReady = entries.includes('index.m3u8')
      const segments = entries.filter((entry) => /^segment-\d+\.ts$/.test(entry))
      this.segmentCount = segments.length
      if (segments.length) {
        const latest = await Promise.all(segments.map(async (entry) => (await stat(join(this.rootDir, entry))).mtimeMs))
        this.lastSegmentAt = new Date(Math.max(...latest)).toISOString()
      }
    } catch (error) {
      this.events.publish('preview.scan.failed', { error: error instanceof Error ? error.message : String(error) })
    }
  }

  private fail(error: unknown): void {
    this.state = 'failed'
    this.lastError = error instanceof Error ? error.message : String(error)
    this.events.publish('preview.failed', { error: this.lastError })
  }

  private stopMonitor(): void {
    if (this.monitor) clearInterval(this.monitor)
    this.monitor = null
  }
}
