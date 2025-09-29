import assert from "node:assert"
import { describe, test } from "node:test"

void describe("Validation Middleware", () => {
  void test("should export validation schemas", async () => {
    const { ChatCompletionRequestSchema, AnthropicMessageRequestSchema, EmbeddingRequestSchema } = await import("../../src/lib/validation.js")
    
    assert.strictEqual(typeof ChatCompletionRequestSchema, "object")
    assert.strictEqual(typeof AnthropicMessageRequestSchema, "object")
    assert.strictEqual(typeof EmbeddingRequestSchema, "object")
  })
  
  void test("should validate chat completion request", async () => {
    const { ChatCompletionRequestSchema } = await import("../../src/lib/validation.js")
    
    const validRequest = {
      model: "gpt-4",
      messages: [
        { role: "user", content: "Hello" }
      ]
    }
    
    const result = ChatCompletionRequestSchema.safeParse(validRequest)
    assert.strictEqual(result.success, true)
  })
  
  void test("should reject invalid chat completion request", async () => {
    const { ChatCompletionRequestSchema } = await import("../../src/lib/validation.js")
    
    const invalidRequest = {
      model: "", // Empty model
      messages: [] // Empty messages
    }
    
    const result = ChatCompletionRequestSchema.safeParse(invalidRequest)
    assert.strictEqual(result.success, false)
  })
  
  void test("should validate anthropic message request", async () => {
    const { AnthropicMessageRequestSchema } = await import("../../src/lib/validation.js")
    
    const validRequest = {
      model: "claude-3",
      messages: [
        { role: "user", content: "Hello" }
      ],
      max_tokens: 100
    }
    
    const result = AnthropicMessageRequestSchema.safeParse(validRequest)
    assert.strictEqual(result.success, true)
  })
  
  void test("should validate embedding request", async () => {
    const { EmbeddingRequestSchema } = await import("../../src/lib/validation.js")
    
    const validRequest = {
      input: "Hello world"
    }
    
    const result = EmbeddingRequestSchema.safeParse(validRequest)
    assert.strictEqual(result.success, true)
  })
  
  void test("should validate with array input for embeddings", async () => {
    const { EmbeddingRequestSchema } = await import("../../src/lib/validation.js")
    
    const validRequest = {
      input: ["Hello", "world"]
    }
    
    const result = EmbeddingRequestSchema.safeParse(validRequest)
    assert.strictEqual(result.success, true)
  })
})