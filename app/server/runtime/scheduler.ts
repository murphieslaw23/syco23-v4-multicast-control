import type { ControlService } from './control-service'
import type { OperationsStore, ScheduleJob } from './operations'
import type { RuntimeEventBus } from './event-bus'

export class SchedulerRuntime {
  private timer: NodeJS.Timeout | null = null
  private running = false
  constructor(private readonly operations: OperationsStore, private readonly control: ControlService, private readonly events: RuntimeEventBus) {}

  start(intervalMs = 1000): void {
    if (this.timer) return
    this.timer = setInterval(() => void this.tick(), intervalMs)
    this.timer.unref()
  }

  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = null }

  async tick(now = new Date()): Promise<void> {
    if (this.running) return
    this.running = true
    try {
      for (const job of this.operations.due(now)) await this.execute(job)
    } finally { this.running = false }
  }

  private async execute(job: ScheduleJob): Promise<void> {
    this.events.publish('schedule.executing', { id: job.id, action: job.action })
    try {
      if (job.action === 'pipeline.start') await this.control.startPipeline(job.payload as never)
      if (job.action === 'pipeline.stop') await this.control.stopPipeline()
      if (job.action === 'destination.enable' || job.action === 'destination.disable') {
        const id = String(job.payload.destinationId || '')
        if (!id) throw new Error('destinationId is required')
        await this.control.patchDestination(id, { status: job.action === 'destination.enable' ? 'configured' : 'disabled' })
      }
      await this.operations.markExecuted(job)
      this.events.publish('schedule.completed', { id: job.id })
    } catch (error) {
      await this.operations.markExecuted(job, error)
      await this.operations.openIncident('warning', `Scheduled action failed: ${job.name}`, error instanceof Error ? error.message : String(error), 'scheduler')
      this.events.publish('schedule.failed', { id: job.id, error: error instanceof Error ? error.message : String(error) })
    }
  }
}
