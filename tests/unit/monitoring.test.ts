import assert from "node:assert"
import { describe, test } from "node:test"

import { metricsCollector } from "../../src/lib/monitoring.js"

void describe("Performance Monitoring", () => {
  void test("should initialize metrics collector", () => {
    const metrics = metricsCollector.getMetrics()
    
    assert.strictEqual(typeof metrics.requests, "object")
    assert.strictEqual(typeof metrics.timing, "object")
    assert.strictEqual(typeof metrics.system, "object")
    assert.strictEqual(typeof metrics.errors, "object")
  })
  
  void test("should record request metrics", () => {
    const initialMetrics = metricsCollector.getMetrics()
    const initialTotal = initialMetrics.requests.total
    
    // Record a successful request
    metricsCollector.recordRequest("GET", "/test", 200, 100)
    
    const updatedMetrics = metricsCollector.getMetrics()
    assert.strictEqual(updatedMetrics.requests.total, initialTotal + 1)
    assert.strictEqual(updatedMetrics.requests.success, initialMetrics.requests.success + 1)
    assert.strictEqual(updatedMetrics.requests.by_method["GET"], (initialMetrics.requests.by_method["GET"] || 0) + 1)
  })
  
  void test("should record error metrics", () => {
    const initialMetrics = metricsCollector.getMetrics()
    const initialErrors = initialMetrics.errors.total
    
    const testError = new Error("Test error")
    metricsCollector.recordRequest("POST", "/error", 500, 50, testError)
    
    const updatedMetrics = metricsCollector.getMetrics()
    assert.strictEqual(updatedMetrics.errors.total, initialErrors + 1)
    assert.strictEqual(updatedMetrics.requests.error, initialMetrics.requests.error + 1)
  })
  
  void test("should track response times", () => {
    const initialMetrics = metricsCollector.getMetrics()
    const responseTimes = [50, 100, 150, 200]
    
    responseTimes.forEach((time, index) => {
      metricsCollector.recordRequest("GET", `/test${index}`, 200, time)
    })
    
    const updatedMetrics = metricsCollector.getMetrics()
    assert.strictEqual(updatedMetrics.timing.response_times.length > initialMetrics.timing.response_times.length, true)
    assert.strictEqual(typeof updatedMetrics.timing.average_response_time, "number")
    assert.strictEqual(typeof updatedMetrics.timing.min_response_time, "number")
    assert.strictEqual(typeof updatedMetrics.timing.max_response_time, "number")
  })
  
  void test("should provide metrics summary", () => {
    const summary = metricsCollector.getSummary()
    
    assert.strictEqual(typeof summary.total_requests, "number")
    assert.strictEqual(typeof summary.success_rate, "string")
    assert.strictEqual(typeof summary.error_rate, "string")
    assert.strictEqual(typeof summary.average_response_time, "string")
    assert.strictEqual(typeof summary.memory_usage, "string")
    assert.strictEqual(typeof summary.uptime, "string")
    assert.strictEqual(Array.isArray(summary.top_endpoints), true)
  })
  
  void test("should reset metrics", () => {
    // Add some data first
    metricsCollector.recordRequest("GET", "/test", 200, 100)
    
    const beforeReset = metricsCollector.getMetrics()
    assert.strictEqual(beforeReset.requests.total > 0, true)
    
    metricsCollector.reset()
    
    const afterReset = metricsCollector.getMetrics()
    assert.strictEqual(afterReset.requests.total, 0)
    assert.strictEqual(afterReset.requests.success, 0)
    assert.strictEqual(afterReset.errors.total, 0)
  })
  
  void test("should normalize paths correctly", () => {
    // This tests the internal path normalization
    metricsCollector.recordRequest("GET", "/users/123", 200, 100)
    metricsCollector.recordRequest("GET", "/users/456", 200, 100)
    
    const metrics = metricsCollector.getMetrics()
    // Both requests should be grouped under "/users/:id"
    assert.strictEqual(metrics.requests.by_endpoint["/users/:id"], 2)
  })
})