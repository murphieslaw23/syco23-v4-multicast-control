import { randomBytes } from 'node:crypto'
import type { Role } from './operations'

interface PreviewTicket {
  expiresAt: number
  role: Role
}

export class PreviewTicketStore {
  private readonly tickets = new Map<string, PreviewTicket>()

  issue(role: Role, ttlMs = 5 * 60_000): { ticket: string; expiresAt: string } {
    this.prune()
    const ticket = randomBytes(24).toString('base64url')
    const expiresAt = Date.now() + ttlMs
    this.tickets.set(ticket, { expiresAt, role })
    return { ticket, expiresAt: new Date(expiresAt).toISOString() }
  }

  validate(ticket: string | null): PreviewTicket | null {
    if (!ticket) return null
    const record = this.tickets.get(ticket)
    if (!record) return null
    if (record.expiresAt <= Date.now()) {
      this.tickets.delete(ticket)
      return null
    }
    return record
  }

  revoke(ticket: string): void {
    this.tickets.delete(ticket)
  }

  private prune(): void {
    const now = Date.now()
    for (const [ticket, record] of this.tickets) {
      if (record.expiresAt <= now) this.tickets.delete(ticket)
    }
  }
}
