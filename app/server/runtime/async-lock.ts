import { ApiError } from './errors'

export class AsyncCommandLock {
  private active: string | null = null
  async run<T>(name: string, operation: () => Promise<T>): Promise<T> {
    if (this.active) throw new ApiError('COMMAND_IN_PROGRESS', `Command ${this.active} is already in progress`, 409)
    this.active = name
    try { return await operation() } finally { this.active = null }
  }
}
