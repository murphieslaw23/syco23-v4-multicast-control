import { randomBytes } from 'node:crypto'
import type { Role } from './operations'

export interface TicketIdentity { actor: string; role: Role }
interface TicketRecord extends TicketIdentity { expiresAt: number }

export class WebSocketTicketStore {
  private readonly tickets = new Map<string, TicketRecord>()
  issue(identity: TicketIdentity, ttlMs = 30_000): { ticket: string; expiresAt: string } {
    const ticket = randomBytes(32).toString('base64url')
    const expiresAt = Date.now() + ttlMs
    this.tickets.set(ticket, { ...identity, expiresAt })
    return { ticket, expiresAt: new Date(expiresAt).toISOString() }
  }
  consume(ticket: string): TicketIdentity | null {
    const record = this.tickets.get(ticket)
    this.tickets.delete(ticket)
    if (!record || record.expiresAt < Date.now()) return null
    return { actor: record.actor, role: record.role }
  }
}
