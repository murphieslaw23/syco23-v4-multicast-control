import { EventEmitter } from 'node:events'

export interface RuntimeEvent<T = unknown> {
  id: string
  type: string
  timestamp: string
  payload: T
}

export class RuntimeEventBus {
  private readonly emitter = new EventEmitter()
  private readonly recent: RuntimeEvent[] = []

  publish<T>(type: string, payload: T): RuntimeEvent<T> {
    const event: RuntimeEvent<T> = { id: crypto.randomUUID(), type, timestamp: new Date().toISOString(), payload }
    this.recent.unshift(event)
    this.recent.splice(250)
    this.emitter.emit('event', event)
    return event
  }

  subscribe(listener: (event: RuntimeEvent) => void): () => void {
    this.emitter.on('event', listener)
    return () => this.emitter.off('event', listener)
  }

  history(limit = 100): RuntimeEvent[] {
    return this.recent.slice(0, Math.max(1, Math.min(limit, 250)))
  }
}
