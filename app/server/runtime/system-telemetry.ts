import { cpus, freemem, loadavg, totalmem, uptime } from 'node:os'
import { readFile } from 'node:fs/promises'
import { statfs } from 'node:fs/promises'
import { monitorEventLoopDelay } from 'node:perf_hooks'

export interface SystemTelemetrySnapshot {
  timestamp: string
  uptimeSeconds: number
  process: { pid: number; rssBytes: number; heapUsedBytes: number; heapTotalBytes: number }
  memory: { totalBytes: number; freeBytes: number; usedPercent: number }
  cpu: { cores: number; load1: number; load5: number; load15: number }
  disk: { path: string; totalBytes: number; freeBytes: number; usedPercent: number } | null
  network: { receivedBytes: number; transmittedBytes: number } | null
  eventLoop: { meanMs: number; maxMs: number; p99Ms: number }
}

export class SystemTelemetry {
  private readonly loop = monitorEventLoopDelay({ resolution: 20 })
  constructor(private readonly dataPath: string) { this.loop.enable() }

  async snapshot(): Promise<SystemTelemetrySnapshot> {
    const memory = process.memoryUsage()
    const total = totalmem()
    const free = freemem()
    const loads = loadavg()
    const disk = await this.diskSnapshot()
    const network = await this.networkSnapshot()
    const result: SystemTelemetrySnapshot = {
      timestamp: new Date().toISOString(),
      uptimeSeconds: uptime(),
      process: { pid: process.pid, rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal },
      memory: { totalBytes: total, freeBytes: free, usedPercent: total ? ((total - free) / total) * 100 : 0 },
      cpu: { cores: cpus().length, load1: loads[0], load5: loads[1], load15: loads[2] },
      disk,
      network,
      eventLoop: {
        meanMs: Number.isFinite(this.loop.mean) ? this.loop.mean / 1e6 : 0,
        maxMs: Number.isFinite(this.loop.max) ? this.loop.max / 1e6 : 0,
        p99Ms: this.loop.percentile(99) / 1e6,
      },
    }
    this.loop.reset()
    return result
  }

  close(): void { this.loop.disable() }

  private async diskSnapshot(): Promise<SystemTelemetrySnapshot['disk']> {
    try {
      const info = await statfs(this.dataPath)
      const totalBytes = Number(info.blocks) * Number(info.bsize)
      const freeBytes = Number(info.bavail) * Number(info.bsize)
      return { path: this.dataPath, totalBytes, freeBytes, usedPercent: totalBytes ? ((totalBytes - freeBytes) / totalBytes) * 100 : 0 }
    } catch { return null }
  }

  private async networkSnapshot(): Promise<SystemTelemetrySnapshot['network']> {
    try {
      const text = await readFile('/proc/net/dev', 'utf8')
      let receivedBytes = 0
      let transmittedBytes = 0
      for (const line of text.split('\n').slice(2)) {
        const [name, payload] = line.split(':')
        if (!payload || name.trim() === 'lo') continue
        const fields = payload.trim().split(/\s+/)
        receivedBytes += Number(fields[0] || 0)
        transmittedBytes += Number(fields[8] || 0)
      }
      return { receivedBytes, transmittedBytes }
    } catch { return null }
  }
}
