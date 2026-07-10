import type { PipelineHealth } from '../../types'

export type SupervisorState = 'idle' | 'preparing' | 'starting' | 'running' | 'stopping' | 'failed'

export interface SupervisorSnapshot {
  state: SupervisorState
  health: PipelineHealth
  pid: number | null
  startedAt: string | null
  stoppedAt: string | null
  restartCount: number
  lastError: string | null
}

const transitions: Record<SupervisorState, SupervisorState[]> = {
  idle: ['preparing'],
  preparing: ['starting', 'failed', 'idle'],
  starting: ['running', 'failed', 'stopping'],
  running: ['stopping', 'failed'],
  stopping: ['idle', 'failed'],
  failed: ['preparing', 'idle'],
}

export class PipelineSupervisor {
  private snapshot: SupervisorSnapshot = {
    state: 'idle',
    health: 'ok',
    pid: null,
    startedAt: null,
    stoppedAt: null,
    restartCount: 0,
    lastError: null,
  }

  getSnapshot(): Readonly<SupervisorSnapshot> {
    return { ...this.snapshot }
  }

  transition(next: SupervisorState): void {
    if (!transitions[this.snapshot.state].includes(next)) {
      throw new Error(`Invalid pipeline transition: ${this.snapshot.state} -> ${next}`)
    }
    this.snapshot.state = next
    if (next === 'running') {
      this.snapshot.health = 'ok'
      this.snapshot.startedAt = new Date().toISOString()
      this.snapshot.stoppedAt = null
      this.snapshot.lastError = null
    }
    if (next === 'idle') {
      this.snapshot.pid = null
      this.snapshot.stoppedAt = new Date().toISOString()
    }
  }

  attachProcess(pid: number): void {
    if (this.snapshot.state !== 'starting') throw new Error('Process can only attach while starting')
    if (!Number.isInteger(pid) || pid <= 0) throw new Error('Invalid process id')
    this.snapshot.pid = pid
    this.transition('running')
  }

  fail(error: unknown): void {
    const message = error instanceof Error ? error.message : String(error)
    if (this.snapshot.state !== 'failed') {
      if (!transitions[this.snapshot.state].includes('failed')) throw new Error(`Cannot fail from ${this.snapshot.state}`)
      this.snapshot.state = 'failed'
    }
    this.snapshot.health = 'failed'
    this.snapshot.lastError = message
    this.snapshot.pid = null
  }

  markRestart(): void {
    this.snapshot.restartCount += 1
  }

  reset(): void {
    if (this.snapshot.state === 'failed') this.transition('idle')
    else if (this.snapshot.state !== 'idle') throw new Error('Only failed or idle supervisors can reset')
    this.snapshot.health = 'ok'
    this.snapshot.lastError = null
  }
}
