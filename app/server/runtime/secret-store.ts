import { readFile } from 'node:fs/promises'
import { ApiError } from './errors'

export interface SecretStore { resolve(reference: string): Promise<string> }

function envName(reference: string): string {
  return reference.replace(/^env:/, '').trim()
}

export class EnvironmentSecretStore implements SecretStore {
  async resolve(reference: string): Promise<string> {
    const ref = reference.trim()
    if (!ref) throw new ApiError('SECRET_REFERENCE_REQUIRED', 'Secret reference is required')
    if (ref.startsWith('file:')) {
      const path = ref.slice(5)
      if (!path.startsWith('/run/secrets/')) throw new ApiError('SECRET_PATH_FORBIDDEN', 'Secret files must be under /run/secrets')
      const value = (await readFile(path, 'utf8')).trim()
      if (!value) throw new ApiError('SECRET_EMPTY', `Secret ${ref} is empty`)
      return value
    }
    const key = envName(ref)
    if (!/^[A-Z][A-Z0-9_]{2,127}$/.test(key)) throw new ApiError('SECRET_REFERENCE_INVALID', 'Secret references must be ENV_NAME or env:ENV_NAME')
    const value = process.env[key]?.trim()
    if (!value) throw new ApiError('SECRET_UNRESOLVED', `Secret reference ${key} could not be resolved`, 422)
    return value
  }
}
