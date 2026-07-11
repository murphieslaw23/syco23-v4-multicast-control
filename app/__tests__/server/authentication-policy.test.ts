import { describe, expect, it } from 'vitest'
import type { IncomingMessage } from 'node:http'
import { assertProductionAuthentication, authenticateRequest } from '../../server/runtime/authentication'

const request = (authorization?: string) => ({
  headers: authorization ? { authorization } : {},
} as IncomingMessage)

const sessions = { authenticate: () => null }

describe('runtime authentication policy', () => {
  it('refuses to start production without an authentication mechanism', () => {
    expect(() => assertProductionAuthentication({ NODE_ENV: 'production' })).toThrow(
      'Production authentication is not configured',
    )
  })


  it('allows production restart when an enabled account is already persisted', () => {
    expect(() => assertProductionAuthentication({ NODE_ENV: 'production' }, true)).not.toThrow()
  })

  it('allows explicit local development access only outside production', () => {
    expect(authenticateRequest(request(), sessions, { NODE_ENV: 'development' })).toEqual({
      actor: 'local-dev',
      role: 'admin',
    })
    expect(authenticateRequest(request(), sessions, { NODE_ENV: 'production' })).toBeNull()
  })

  it('authenticates exact bearer tokens and rejects partial matches', () => {
    const env = { NODE_ENV: 'production', SYCO_OPERATOR_TOKEN: 'operator-secret-value' }
    expect(authenticateRequest(request('Bearer operator-secret-value'), sessions, env)).toEqual({
      actor: 'api-operator',
      role: 'operator',
    })
    expect(authenticateRequest(request('Bearer operator-secret-valu'), sessions, env)).toBeNull()
  })
})
