import assert from "node:assert"
import { describe, test } from "node:test"

import {
  HTTPError,
  ValidationError,
  RateLimitError,
  AuthenticationError,
  createRetryableError,
  createValidationError,
  createAuthError
} from "../../src/lib/error.js"

void describe("Error Handling", () => {
  void describe("HTTPError", () => {
    void test("should create HTTPError with response", () => {
      const response = new Response("Test error", { status: 400 })
      const error = new HTTPError("Test message", response)
      
      assert.strictEqual(error.message, "Test message")
      assert.strictEqual(error.statusCode, 400)
      assert.strictEqual(error.errorType, "client_error")
      assert.strictEqual(error.name, "HTTPError")
    })
    
    void test("should classify error types correctly", () => {
      const clientError = new HTTPError("Client error", new Response("", { status: 400 }))
      const serverError = new HTTPError("Server error", new Response("", { status: 500 }))
      const otherError = new HTTPError("Other error", new Response("", { status: 200 }))
      
      assert.strictEqual(clientError.errorType, "client_error")
      assert.strictEqual(serverError.errorType, "server_error")
      assert.strictEqual(otherError.errorType, "error")
    })
    
    void test("should include context if provided", () => {
      const context = { userId: "123", action: "test" }
      const error = new HTTPError("Test", new Response("", { status: 400 }), context)
      
      assert.deepStrictEqual(error.context, context)
    })
  })
  
  void describe("ValidationError", () => {
    void test("should create ValidationError with field and code", () => {
      const error = new ValidationError("Invalid field", "email", "invalid_format")
      
      assert.strictEqual(error.message, "Invalid field")
      assert.strictEqual(error.field, "email")
      assert.strictEqual(error.code, "invalid_format")
      assert.strictEqual(error.name, "ValidationError")
    })
  })
  
  void describe("RateLimitError", () => {
    void test("should create RateLimitError with retry after", () => {
      const error = new RateLimitError("Rate limit exceeded", 60)
      
      assert.strictEqual(error.message, "Rate limit exceeded")
      assert.strictEqual(error.retryAfter, 60)
      assert.strictEqual(error.name, "RateLimitError")
    })
  })
  
  void describe("AuthenticationError", () => {
    void test("should create AuthenticationError", () => {
      const error = new AuthenticationError("Not authenticated")
      
      assert.strictEqual(error.message, "Not authenticated")
      assert.strictEqual(error.name, "AuthenticationError")
    })
  })
  
  void describe("Error Factory Functions", () => {
    void test("should create retryable error", () => {
      const error = createRetryableError("Too many requests", 30)
      
      assert.strictEqual(error instanceof RateLimitError, true)
      assert.strictEqual(error.retryAfter, 30)
    })
    
    void test("should create validation error", () => {
      const error = createValidationError("Invalid input", "name", "required")
      
      assert.strictEqual(error instanceof ValidationError, true)
      assert.strictEqual(error.field, "name")
      assert.strictEqual(error.code, "required")
    })
    
    void test("should create auth error", () => {
      const error = createAuthError("Token expired")
      
      assert.strictEqual(error instanceof AuthenticationError, true)
      assert.strictEqual(error.message, "Token expired")
    })
  })
})