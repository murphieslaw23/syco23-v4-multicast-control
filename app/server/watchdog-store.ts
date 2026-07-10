import type { WatchdogEvent } from '../composables/useWatchdog'

export interface WatchdogPersistenceRecord extends WatchdogEvent {
  id: string
  timestamp: string
}

export interface WatchdogStore {
  events: WatchdogPersistenceRecord[]
  healthy: boolean
}

export function createWatchdogStore() {
  const store: WatchdogStore = {
    events: [],
    healthy: true,
  }

  function record(event: Omit<WatchdogPersistenceRecord, 'id' | 'timestamp'>) {
    const entry: WatchdogPersistenceRecord = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    }
    store.events.push(entry)
    if (event.severity === 'error') {
      store.healthy = false
    }
    return entry
  }

  function setHealthy(value: boolean) {
    store.healthy = value
  }

  function getEvents(limit = 50): WatchdogPersistenceRecord[] {
    return store.events.slice(-limit)
  }

  function clear() {
    store.events = []
    store.healthy = true
  }

  return { record, setHealthy, getEvents, clear, store }
}
