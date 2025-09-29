import type { Context } from "hono"
import type { ContentfulStatusCode } from "hono/utils/http-status"

import consola from "consola"

// Enhanced HTTP Error class with more context
export class HTTPError extends Error {
  response: Response
  statusCode: number
  errorType: string
  context?: Record<string, unknown>

  constructor(
    message: string, 
    response: Response, 
    context?: Record<string, unknown>
  ) {
    super(message)
    this.response = response
    this.statusCode = response.status
    this.errorType = this.getErrorType(response.status)
    this.context = context
    this.name = "HTTPError"
  }

  private getErrorType(status: number): string {
    if (status >= 400 && status < 500) return "client_error"
    if (status >= 500) return "server_error"
    return "error"
  }
}

// Validation Error class
export class ValidationError extends Error {
  field: string
  code: string
  
  constructor(message: string, field: string, code: string) {
    super(message)
    this.field = field
    this.code = code
    this.name = "ValidationError"
  }
}

// Rate Limit Error class
export class RateLimitError extends Error {
  retryAfter: number
  
  constructor(message: string, retryAfter: number) {
    super(message)
    this.retryAfter = retryAfter
    this.name = "RateLimitError"
  }
}

// Authentication Error class
export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AuthenticationError"
  }
}

// Enhanced error forwarding with better error handling
export async function forwardError(c: Context, error: unknown) {
  const requestId = c.get("requestId") || generateRequestId()
  const startTime = c.get("startTime") || Date.now()
  const duration = Date.now() - startTime

  // Log error with context
  consola.error("Error occurred", {
    requestId,
    path: c.req.path,
    method: c.req.method,
    duration,
    error: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack
    } : error
  })

  // Handle different error types
  if (error instanceof HTTPError) {
    const errorText = await error.response.text()
    
    return c.json(
      {
        error: {
          message: errorText,
          type: error.errorType,
          request_id: requestId,
          context: error.context
        },
      },
      error.response.status as ContentfulStatusCode,
    )
  }

  if (error instanceof ValidationError) {
    return c.json(
      {
        error: {
          message: error.message,
          type: "validation_error",
          field: error.field,
          code: error.code,
          request_id: requestId
        }
      },
      400
    )
  }

  if (error instanceof RateLimitError) {
    c.header("Retry-After", error.retryAfter.toString())
    return c.json(
      {
        error: {
          message: error.message,
          type: "rate_limit_error",
          retry_after: error.retryAfter,
          request_id: requestId
        }
      },
      429
    )
  }

  if (error instanceof AuthenticationError) {
    return c.json(
      {
        error: {
          message: error.message,
          type: "authentication_error",
          request_id: requestId
        }
      },
      401
    )
  }

  // Handle generic errors
  const genericError = error as Error
  return c.json(
    {
      error: {
        message: genericError.message || "Internal server error",
        type: "internal_error",
        request_id: requestId
      },
    },
    500,
  )
}

// Request ID generator
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Error boundary middleware
export function errorBoundary() {
  return async (c: Context, next: () => Promise<void>) => {
    const requestId = generateRequestId()
    const startTime = Date.now()
    
    c.set("requestId", requestId)
    c.set("startTime", startTime)
    
    try {
      await next()
    } catch (error) {
      return await forwardError(c, error)
    }
  }
}

// Error recovery utilities
export function createRetryableError(message: string, retryAfter: number = 60): RateLimitError {
  return new RateLimitError(message, retryAfter)
}

export function createValidationError(message: string, field: string, code: string): ValidationError {
  return new ValidationError(message, field, code)
}

export function createAuthError(message: string): AuthenticationError {
  return new AuthenticationError(message)
}
