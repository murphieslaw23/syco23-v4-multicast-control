import { createHash, timingSafeEqual } from 'node:crypto'
import type { IncomingMessage } from 'node:http'
import type { AuthIdentity } from './auth-service'

interface SessionAuthenticator {
  authenticate(request: IncomingMessage): AuthIdentity | null
}

type Environment = Record<string, string | undefined>

function configuredTokens(environment: Environment): Array<[string, AuthIdentity]> {
  const candidates: Array<[string, AuthIdentity]> = [
    [environment.SYCO_ADMIN_TOKEN || environment.SYCO_API_TOKEN || '', { actor: 'api-admin', role: 'admin' }],
    [environment.SYCO_OPERATOR_TOKEN || '', { actor: 'api-operator', role: 'operator' }],
    [environment.SYCO_VIEWER_TOKEN || '', { actor: 'api-viewer', role: 'viewer' }],
  ]
  return candidates.filter(([token]) => token.length > 0)
}

function secureTokenEquals(expected: string, supplied: string): boolean {
  const expectedDigest = createHash('sha256').update(expected).digest()
  const suppliedDigest = createHash('sha256').update(supplied).digest()
  return timingSafeEqual(expectedDigest, suppliedDigest)
}

export function hasConfiguredAuthentication(environment: Environment = process.env): boolean {
  const bootstrap = Boolean(
    environment.SYCO_BOOTSTRAP_ADMIN_USER?.trim()
    && environment.SYCO_BOOTSTRAP_ADMIN_PASSWORD,
  )
  return bootstrap || configuredTokens(environment).length > 0
}

export function assertProductionAuthentication(
  environment: Environment = process.env,
  hasPersistedAccount = false,
): void {
  if (
    environment.NODE_ENV === 'production'
    && !hasConfiguredAuthentication(environment)
    && !hasPersistedAccount
  ) {
    throw new Error(
      'Production authentication is not configured. Set bootstrap administrator credentials or an API token.',
    )
  }
}

export function authenticateRequest(
  request: IncomingMessage,
  sessions: SessionAuthenticator,
  environment: Environment = process.env,
): AuthIdentity | null {
  const session = sessions.authenticate(request)
  if (session) return session

  const authorization = String(request.headers.authorization || '')
  const supplied = authorization.startsWith('Bearer ') ? authorization.slice(7) : ''
  const matched = configuredTokens(environment).find(([token]) => secureTokenEquals(token, supplied))
  if (matched) return matched[1]

  if (environment.NODE_ENV !== 'production' && !hasConfiguredAuthentication(environment)) {
    return { actor: 'local-dev', role: 'admin' }
  }
  return null
}
