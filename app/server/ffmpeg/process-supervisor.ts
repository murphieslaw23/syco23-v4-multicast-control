import { spawn, type ChildProcessByStdio } from 'node:child_process'
import type { Readable } from 'node:stream'
import { PipelineSupervisor } from './supervisor'
import type { FfmpegCommand } from './command-builder'
import type { RuntimeEventBus } from '../runtime/event-bus'

export interface ProcessMetrics {
  frame: number
  fps: number
  bitrateKbps: number
  speed: number
  outTimeMs: number
}

export class FfmpegProcessSupervisor {
  private process: ChildProcessByStdio<null, Readable, Readable> | null = null
  private readonly lifecycle = new PipelineSupervisor()
  private metrics: ProcessMetrics = { frame: 0, fps: 0, bitrateKbps: 0, speed: 0, outTimeMs: 0 }
  private stopping = false
  private startedAt: string | null = null
  private lastProgressAt: string | null = null

  constructor(private readonly events: RuntimeEventBus) {}

  snapshot() {
    return { ...this.lifecycle.getSnapshot(), metrics: { ...this.metrics }, startedAt: this.startedAt, lastProgressAt: this.lastProgressAt }
  }

  start(command: FfmpegCommand): void {
    const state = this.lifecycle.getSnapshot().state
    if (state !== 'idle' && state !== 'failed') throw new Error(`Pipeline cannot start from ${state}`)
    if (state === 'failed') this.lifecycle.reset()
    this.lifecycle.transition('preparing')
    this.lifecycle.transition('starting')
    this.stopping = false
    this.startedAt = new Date().toISOString()
    this.lastProgressAt = this.startedAt

    const args = [...command.args, '-progress', 'pipe:1', '-nostats']
    const child = spawn(command.executable, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env })
    this.process = child
    child.once('spawn', () => {
      if (!child.pid) return this.fail(new Error('FFmpeg started without a process id'))
      this.lifecycle.attachProcess(child.pid)
      this.events.publish('pipeline.started', { pid: child.pid, outputs: command.outputCount, args: command.redactedArgs })
    })
    child.stdout.setEncoding('utf8')
    let progressBuffer = ''
    child.stdout.on('data', (chunk: string) => {
      progressBuffer += chunk
      const lines = progressBuffer.split(/\r?\n/)
      progressBuffer = lines.pop() ?? ''
      for (const line of lines) this.parseProgress(line)
    })
    child.stderr.setEncoding('utf8')
    child.stderr.on('data', (chunk: string) => {
      const message = chunk.trim()
      if (message) this.events.publish('pipeline.stderr', { message: message.slice(-2000) })
    })
    child.once('error', (error) => this.fail(error))
    child.once('exit', (code, signal) => {
      this.process = null
      if (this.stopping && this.lifecycle.getSnapshot().state === 'stopping') {
        this.lifecycle.transition('idle')
        this.events.publish('pipeline.stopped', { code, signal })
      } else if (code !== 0) {
        this.fail(new Error(`FFmpeg exited with code ${code ?? 'null'} (${signal ?? 'no signal'})`))
      } else {
        const current = this.lifecycle.getSnapshot().state
        if (current === 'running') this.lifecycle.transition('stopping')
        if (this.lifecycle.getSnapshot().state === 'stopping') this.lifecycle.transition('idle')
        this.events.publish('pipeline.completed', { code, signal })
      }
    })
  }

  async stop(graceMs = 8000): Promise<void> {
    const child = this.process
    if (!child) {
      if (this.lifecycle.getSnapshot().state === 'failed') this.lifecycle.reset()
      return
    }
    const state = this.lifecycle.getSnapshot().state
    if (state === 'starting' || state === 'running') this.lifecycle.transition('stopping')
    this.stopping = true
    child.kill('SIGTERM')
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); resolve() }, graceMs)
      child.once('exit', () => { clearTimeout(timer); resolve() })
    })
  }

  private parseProgress(line: string): void {
    const [key, raw = ''] = line.split('=', 2)
    const number = Number.parseFloat(raw)
    if (key === 'frame' && Number.isFinite(number)) this.metrics.frame = number
    if (key === 'fps' && Number.isFinite(number)) this.metrics.fps = number
    if (key === 'bitrate') this.metrics.bitrateKbps = Number.parseFloat(raw.replace('kbits/s', '')) || 0
    if (key === 'speed') this.metrics.speed = Number.parseFloat(raw.replace('x', '')) || 0
    if (key === 'out_time_ms' && Number.isFinite(number)) this.metrics.outTimeMs = number
    if (key === 'progress') { this.lastProgressAt = new Date().toISOString(); this.events.publish('pipeline.metrics', { ...this.metrics }) }
  }

  private fail(error: unknown): void {
    try { this.lifecycle.fail(error) } catch { /* lifecycle already terminal */ }
    this.events.publish('pipeline.failed', { error: error instanceof Error ? error.message : String(error) })
  }
}
