export class ApiError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 422,
    readonly detail?: unknown,
  ) { super(message); this.name = 'ApiError' }
}

export function asApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error
  const message = error instanceof Error ? error.message : String(error)
  if (message.startsWith('Forbidden')) return new ApiError('FORBIDDEN', message, 403)
  if (/not found/i.test(message)) return new ApiError('NOT_FOUND', message, 404)
  if (/already|cannot start|cannot stop|conflict/i.test(message)) return new ApiError('CONFLICT', message, 409)
  return new ApiError('VALIDATION_ERROR', message, 422)
}
