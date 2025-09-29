import type { Context, Next } from "hono"

import consola from "consola"
import { z } from "zod"

import { HTTPError } from "./error.js"

// Common validation schemas
export const ChatCompletionRequestSchema = z.object({
  model: z.string().min(1, "Model is required"),
  messages: z.array(z.object({
    role: z.enum(["system", "user", "assistant", "tool", "function", "developer"]),
    content: z.union([z.string(), z.array(z.any()), z.object({})]).optional(),
    name: z.string().optional(),
    tool_calls: z.array(z.any()).optional(),
    tool_call_id: z.string().optional()
  })).min(1, "At least one message is required"),
  max_tokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.union([z.string(), z.object({})]).optional(),
  user: z.string().optional()
})

export const AnthropicMessageRequestSchema = z.object({
  model: z.string().min(1, "Model is required"),
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.union([
      z.string(),
      z.array(z.union([
        z.object({ type: z.literal("text"), text: z.string() }),
        z.object({ type: z.literal("image"), source: z.any() }),
        z.object({ type: z.literal("tool_use"), id: z.string(), name: z.string(), input: z.any() }),
        z.object({ type: z.literal("tool_result"), tool_use_id: z.string(), content: z.any() })
      ]))
    ])
  })).min(1, "At least one message is required"),
  max_tokens: z.number().int().positive(),
  system: z.union([z.string(), z.array(z.object({ type: z.literal("text"), text: z.string() }))]).optional(),
  temperature: z.number().min(0).max(1).optional(),
  top_p: z.number().min(0).max(1).optional(),
  stream: z.boolean().optional(),
  stop_sequences: z.array(z.string()).optional(),
  tools: z.array(z.any()).optional(),
  tool_choice: z.union([z.literal("auto"), z.literal("any"), z.object({ type: z.literal("tool"), name: z.string() })]).optional()
})

export const EmbeddingRequestSchema = z.object({
  input: z.union([z.string(), z.array(z.string())]),
  model: z.string().optional(),
  encoding_format: z.enum(["float", "base64"]).optional(),
  dimensions: z.number().int().positive().optional(),
  user: z.string().optional()
})

// Validation middleware factory
export function validateRequest<T>(schema: z.ZodSchema<T>) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      const validatedData = schema.parse(body)
      
      // Store validated data in context for use in handlers
      c.set("validatedBody", validatedData)
      
      consola.debug("Request validation passed", {
        path: c.req.path,
        method: c.req.method
      })
      
      await next()
    } catch (error) {
      if (error instanceof z.ZodError) {
        consola.warn("Request validation failed", {
          path: c.req.path,
          method: c.req.method,
          errors: error.errors
        })
        
        throw new HTTPError(
          "Invalid request payload",
          Response.json({
            error: {
              message: "Validation failed",
              type: "validation_error",
              details: error.errors.map(err => ({
                field: err.path.join("."),
                message: err.message,
                code: err.code
              }))
            }
          }, { status: 400 })
        )
      }
      
      consola.error("Unexpected validation error", error)
      throw new HTTPError(
        "Request validation error",
        Response.json({
          error: {
            message: "Request validation failed",
            type: "validation_error"
          }
        }, { status: 400 })
      )
    }
  }
}

// Security middleware for input sanitization
export function sanitizeInput() {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json()
      
      // Recursively sanitize strings in the object
      const sanitized = sanitizeObject(body)
      
      // Store sanitized data back
      c.set("sanitizedBody", sanitized)
      
      await next()
    } catch (error) {
      consola.error("Input sanitization error", error)
      // Continue with original body if sanitization fails
      await next()
    }
  }
}

// Helper function to recursively sanitize an object
function sanitizeObject(obj: any): any {
  if (typeof obj === "string") {
    return sanitizeString(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  
  if (obj && typeof obj === "object") {
    const sanitized: any = {}
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value)
    }
    return sanitized
  }
  
  return obj
}

// Basic string sanitization
function sanitizeString(str: string): string {
  return str
    // Remove null bytes
    .replace(/\0/g, "")
    // Limit string length to prevent DoS
    .slice(0, 50000)
    // Remove or escape potentially dangerous patterns
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/data:text\/html/gi, "")
}

// Rate limiting headers middleware
export function addRateLimitHeaders() {
  return async (c: Context, next: Next) => {
    await next()
    
    // Add standard rate limiting headers
    const headers = new Headers(c.res.headers)
    
    // Add rate limit info if available
    if (c.get("rateLimitRemaining") !== undefined) {
      headers.set("X-RateLimit-Remaining", c.get("rateLimitRemaining").toString())
    }
    
    if (c.get("rateLimitReset") !== undefined) {
      headers.set("X-RateLimit-Reset", c.get("rateLimitReset").toString())
    }
    
    if (c.get("rateLimitLimit") !== undefined) {
      headers.set("X-RateLimit-Limit", c.get("rateLimitLimit").toString())
    }
    
    // Add security headers
    headers.set("X-Content-Type-Options", "nosniff")
    headers.set("X-Frame-Options", "DENY")
    headers.set("X-XSS-Protection", "1; mode=block")
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
    
    // Update response with new headers
    c.res = new Response(c.res.body, {
      status: c.res.status,
      statusText: c.res.statusText,
      headers
    })
  }
}