import { afterEach, describe, expect, it } from 'vitest'
import { EnvironmentSecretStore } from '../../server/runtime/secret-store'
import { WebSocketTicketStore } from '../../server/runtime/ws-tickets'
import { AsyncCommandLock } from '../../server/runtime/async-lock'

const key = 'SYCO_TEST_STREAM_KEY'
afterEach(() => { delete process.env[key] })

describe('production security primitives', () => {
  it('resolves explicit environment secret references and fails closed', async () => {
    const store = new EnvironmentSecretStore()
    process.env[key] = 'secret-value'
    await expect(store.resolve(`env:${key}`)).resolves.toBe('secret-value')
    delete process.env[key]
    await expect(store.resolve(`env:${key}`)).rejects.toMatchObject({ code: 'SECRET_UNRESOLVED' })
  })

  it('issues single-use websocket tickets', () => {
    const tickets = new WebSocketTicketStore()
    const issued = tickets.issue({ actor: 'operator', role: 'operator' })
    expect(tickets.consume(issued.ticket)).toEqual({ actor: 'operator', role: 'operator' })
    expect(tickets.consume(issued.ticket)).toBeNull()
  })

  it('serializes conflicting runtime commands', async () => {
    const lock = new AsyncCommandLock()
    let release!: () => void
    const waiting = new Promise<void>((resolve) => { release = resolve })
    const first = lock.run('pipeline.start', () => waiting)
    await expect(lock.run('pipeline.stop', async () => undefined)).rejects.toMatchObject({ code: 'COMMAND_IN_PROGRESS' })
    release()
    await first
  })
})
