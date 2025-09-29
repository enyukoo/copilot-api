import assert from "node:assert"
import { describe, test } from "node:test"

void describe("Health Check Integration", () => {
  void test("should create health route", async () => {
    const { healthRoute } = await import("../../src/routes/health/route.js")
    
    assert.strictEqual(typeof healthRoute, "object")
    assert.strictEqual(typeof healthRoute.fetch, "function")
  })
  
  void test("should handle health check request", async () => {
    const { healthRoute } = await import("../../src/routes/health/route.js")
    
    const request = new Request("http://localhost/")
    const response = await healthRoute.fetch(request)
    
    assert.strictEqual(response.status === 200 || response.status === 503, true)
    
    const data = await response.json() as any
    assert.strictEqual(typeof data.status, "string")
    assert.strictEqual(typeof data.timestamp, "string")
    assert.strictEqual(typeof data.uptime, "number")
    assert.strictEqual(typeof data.services, "object")
  })
  
  void test("should handle detailed health check", async () => {
    const { healthRoute } = await import("../../src/routes/health/route.js")
    
    const request = new Request("http://localhost/detailed")
    const response = await healthRoute.fetch(request)
    
    assert.strictEqual(response.status === 200 || response.status === 503, true)
    
    const data = await response.json() as any
    assert.strictEqual(typeof data.process, "object")
    assert.strictEqual(typeof data.environment, "object")
    assert.strictEqual(typeof data.features, "object")
  })
})