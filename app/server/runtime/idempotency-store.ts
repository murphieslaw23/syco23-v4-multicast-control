export interface IdempotencyRecord<T> {
  value: T
  expiresAt: number
}

export class IdempotencyStore {
  private readonly records = new Map<string, IdempotencyRecord<unknown>>()

  constructor(private readonly ttlMs = 5 * 60_000) {}

  get<T>(scope: string, key: string): T | null {
    this.prune()
    const record = this.records.get(`${scope}:${key}`)
    return record ? record.value as T : null
  }

  set<T>(scope: string, key: string, value: T): void {
    this.records.set(`${scope}:${key}`, { value, expiresAt: Date.now() + this.ttlMs })
  }

  private prune(): void {
    const now = Date.now()
    for (const [key, record] of this.records) if (record.expiresAt <= now) this.records.delete(key)
  }
}
