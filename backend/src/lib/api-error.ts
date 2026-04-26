/**
 * API Error Handling Utilities
 * Provides standardized error handling for API responses and client-side error extraction.
 */

export class ApiError extends Error {
  public statusCode: number
  public code: string
  public details?: Record<string, unknown>

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'UNKNOWN_ERROR',
    details?: Record<string, unknown>
  ) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }
}

interface HandleApiErrorOptions {
  /** Override the default redirect behavior */
  skipRedirect?: boolean
}

/**
 * Parses a fetch Response and returns a user-friendly error message.
 * Handles common HTTP status codes with appropriate actions.
 */
export async function handleApiError(
  response: Response,
  options: HandleApiErrorOptions = {}
): Promise<ApiError> {
  const { skipRedirect = false } = options

  let message = 'An unexpected error occurred'
  let code = 'UNKNOWN_ERROR'
  let details: Record<string, unknown> | undefined

  try {
    const body = await response.json()
    message = body.error || body.message || message
    code = body.code || code
    details = body.details
  } catch {
    // Response body is not JSON — use defaults
  }

  switch (response.status) {
    case 401: {
      code = 'UNAUTHORIZED'
      message = message === 'An unexpected error occurred'
        ? 'Session expired. Please log in again.'
        : message
      if (!skipRedirect && typeof window !== 'undefined') {
        // Redirect to login via store navigation
        window.location.href = '/'
      }
      break
    }

    case 403: {
      code = 'FORBIDDEN'
      message = message === 'An unexpected error occurred'
        ? 'You do not have permission to perform this action.'
        : message
      break
    }

    case 404: {
      code = 'NOT_FOUND'
      message = message === 'An unexpected error occurred'
        ? 'The requested resource was not found.'
        : message
      break
    }

    case 429: {
      code = 'RATE_LIMITED'
      const retryAfter = response.headers.get('Retry-After')
      const seconds = retryAfter ? parseInt(retryAfter, 10) : null
      message = seconds
        ? `Too many requests. Please try again in ${seconds} seconds.`
        : 'Too many requests. Please try again later.'
      break
    }

    case 500: {
      code = 'SERVER_ERROR'
      message = message === 'An unexpected error occurred'
        ? 'A server error occurred. Please try again later.'
        : message
      break
    }

    default: {
      if (response.status >= 400 && response.status < 500) {
        code = 'CLIENT_ERROR'
      } else if (response.status >= 500) {
        code = 'SERVER_ERROR'
      }
    }
  }

  return new ApiError(message, response.status, code, details)
}

/**
 * Extracts a user-friendly error message from any error type.
 * Works with ApiError, native Error, strings, and unknown types.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  if (typeof error === 'string') {
    return error
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message)
  }

  return 'An unexpected error occurred. Please try again.'
}
