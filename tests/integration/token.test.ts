import assert from "node:assert"
import { describe, test } from "node:test"

void describe("Token Route Integration", () => {
  void test("should create token route", async () => {
    const { tokenRoute } = await import("../../src/routes/token/route.js")
    
    assert.strictEqual(typeof tokenRoute, "object")
    assert.strictEqual(typeof tokenRoute.fetch, "function")
  })
  
  void test("should handle token status request", async () => {
    const { tokenRoute } = await import("../../src/routes/token/route.js")
    
    const request = new Request("http://localhost/status")
    const response = await tokenRoute.fetch(request)
    
    assert.strictEqual(response.status, 200)
    
    const data = await response.json() as any
    assert.strictEqual(typeof data.github_authenticated, "boolean")
    assert.strictEqual(typeof data.copilot_authenticated, "boolean")
    assert.strictEqual(typeof data.account_type, "string")
  })
  
  void test("should handle token validation request", async () => {
    const { tokenRoute } = await import("../../src/routes/token/route.js")
    
    const request = new Request("http://localhost/validate", {
      method: "POST"
    })
    const response = await tokenRoute.fetch(request)
    
    // Should return 200 or 401 depending on token state
    assert.strictEqual(response.status === 200 || response.status === 401, true)
    
    const data = await response.json() as any
    assert.strictEqual(typeof data.github_token_valid, "boolean")
    assert.strictEqual(typeof data.copilot_token_valid, "boolean")
    assert.strictEqual(typeof data.overall_valid, "boolean")
  })
  
  void test("should handle token info request without showing tokens", async () => {
    const { tokenRoute } = await import("../../src/routes/token/route.js")
    
    const request = new Request("http://localhost/")
    const response = await tokenRoute.fetch(request)
    
    assert.strictEqual(response.status, 200)
    
    const data = await response.json() as any
    assert.strictEqual(typeof data.has_github_token, "boolean")
    assert.strictEqual(typeof data.has_copilot_token, "boolean")
    // Should not include actual tokens by default
    assert.strictEqual(data.github_token, undefined)
    assert.strictEqual(data.copilot_token, undefined)
  })
})