import assert from "node:assert"
import { describe, test } from "node:test"
import { performance } from "node:perf_hooks"

void describe("Performance Tests", () => {
  void describe("Response Time Tests", () => {
    void test("should handle concurrent requests efficiently", async () => {
      // Mock a simple handler function
      const mockHandler = async () => {
        // Simulate some async work
        await new Promise(resolve => setTimeout(resolve, 10))
        return { success: true }
      }
      
      const concurrentRequests = 50
      const startTime = performance.now()
      
      // Run concurrent requests
      const promises = Array.from({ length: concurrentRequests }, () => mockHandler())
      const results = await Promise.all(promises)
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / concurrentRequests
      
      // All requests should succeed
      assert.strictEqual(results.length, concurrentRequests)
      results.forEach(result => {
        assert.strictEqual(result.success, true)
      })
      
      // Average response time should be reasonable (less than 100ms per request)
      assert.strictEqual(averageTime < 100, true, `Average response time ${averageTime.toFixed(2)}ms is too slow`)
      
      console.log(`Concurrent requests test: ${concurrentRequests} requests in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(2)}ms per request)`)
    })
    
    void test("should have acceptable memory usage under load", async () => {
      const initialMemory = process.memoryUsage()
      
      // Simulate memory-intensive operations
      const largeArrays: number[][] = []
      for (let i = 0; i < 100; i++) {
        largeArrays.push(new Array(1000).fill(i))
      }
      
      // Process the arrays
      const processedData = largeArrays.map(arr => 
        arr.reduce((sum, val) => sum + val, 0)
      )
      
      const peakMemory = process.memoryUsage()
      
      // Clean up
      largeArrays.length = 0
      processedData.length = 0
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc()
      }
      
      // Memory should not grow excessively
      const heapGrowth = peakMemory.heapUsed - initialMemory.heapUsed
      const mbGrowth = heapGrowth / 1024 / 1024
      
      assert.strictEqual(mbGrowth < 100, true, `Memory growth of ${mbGrowth.toFixed(2)}MB is excessive`)
      
      console.log(`Memory test: grew by ${mbGrowth.toFixed(2)}MB during load test`)
    })
  })
  
  void describe("Validation Performance", () => {
    void test("should validate requests quickly", async () => {
      const { ChatCompletionRequestSchema } = await import("../../src/lib/validation.js")
      
      const testRequest = {
        model: "gpt-4",
        messages: [
          { role: "user", content: "Hello, world!" }
        ],
        temperature: 0.7,
        max_tokens: 1000
      }
      
      const iterations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const result = ChatCompletionRequestSchema.safeParse(testRequest)
        assert.strictEqual(result.success, true)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / iterations
      
      // Validation should be fast (less than 1ms per validation)
      assert.strictEqual(averageTime < 1, true, `Validation time ${averageTime.toFixed(3)}ms is too slow`)
      
      console.log(`Validation performance: ${iterations} validations in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(3)}ms)`)
    })
    
    void test("should handle large payloads efficiently", async () => {
      const { ChatCompletionRequestSchema } = await import("../../src/lib/validation.js")
      
      // Create a large but valid request
      const largeRequest = {
        model: "gpt-4",
        messages: Array.from({ length: 100 }, (_, i) => ({
          role: i % 2 === 0 ? "user" : "assistant",
          content: `This is message ${i} with some content that makes it longer to test performance with larger payloads.`
        })),
        temperature: 0.7,
        max_tokens: 1000
      }
      
      const startTime = performance.now()
      const result = ChatCompletionRequestSchema.safeParse(largeRequest)
      const endTime = performance.now()
      
      assert.strictEqual(result.success, true)
      
      const validationTime = endTime - startTime
      // Large payload validation should still be reasonable (less than 10ms)
      assert.strictEqual(validationTime < 10, true, `Large payload validation time ${validationTime.toFixed(2)}ms is too slow`)
      
      console.log(`Large payload validation: ${validationTime.toFixed(2)}ms`)
    })
  })
  
  void describe("Monitoring Performance", () => {
    void test("should collect metrics efficiently", async () => {
      const { metricsCollector } = await import("../../src/lib/monitoring.js")
      
      const iterations = 1000
      const startTime = performance.now()
      
      // Simulate metric collection
      for (let i = 0; i < iterations; i++) {
        const mockError = i % 10 === 0 ? new Error("TestError") : undefined
        metricsCollector.recordRequest("/test", "GET", 200, 50, mockError)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / iterations
      
      // Metric collection should be very fast (less than 0.1ms per operation)
      assert.strictEqual(averageTime < 0.1, true, `Metric collection time ${averageTime.toFixed(4)}ms is too slow`)
      
      // Get metrics summary to verify data was collected
      const summary = metricsCollector.getSummary()
      assert.strictEqual(summary.total_requests >= iterations, true)
      
      console.log(`Metrics performance: ${iterations} operations in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(4)}ms)`)
    })
    
    void test("should export metrics format quickly", async () => {
      const { metricsCollector } = await import("../../src/lib/monitoring.js")
      
      // Add some test data
      for (let i = 0; i < 100; i++) {
        const responseTime = Math.random() * 100
        metricsCollector.recordRequest(`/test${i % 5}`, "GET", 200, responseTime)
      }
      
      const startTime = performance.now()
      const summary = metricsCollector.getSummary()
      const endTime = performance.now()
      
      const exportTime = endTime - startTime
      
      // Metrics export should be fast (less than 5ms)
      assert.strictEqual(exportTime < 5, true, `Metrics export time ${exportTime.toFixed(2)}ms is too slow`)
      assert.strictEqual(typeof summary, "object")
      assert.strictEqual(summary.total_requests > 0, true)
      
      console.log(`Metrics export performance: ${exportTime.toFixed(2)}ms`)
    })
  })
  
  void describe("Error Handling Performance", () => {
    void test("should handle errors efficiently", async () => {
      const { HTTPError } = await import("../../src/lib/error.js")
      
      const iterations = 1000
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        try {
          throw new HTTPError(
            `Test error ${i}`, 
            new Response("Error response", { status: 500 })
          )
        } catch (error) {
          // Error should be properly constructed
          assert.strictEqual(error instanceof HTTPError, true)
          const httpError = error as InstanceType<typeof HTTPError>
          assert.strictEqual(httpError.message.includes("Test error"), true)
        }
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / iterations
      
      // Error creation should be fast (less than 0.5ms per error)
      assert.strictEqual(averageTime < 0.5, true, `Error handling time ${averageTime.toFixed(3)}ms is too slow`)
      
      console.log(`Error handling performance: ${iterations} errors in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(3)}ms)`)
    })
  })
  
  void describe("Configuration Performance", () => {
    void test("should load configuration quickly", async () => {
      const iterations = 100
      const startTime = performance.now()
      
      for (let i = 0; i < iterations; i++) {
        const { configManager } = await import("../../src/lib/config.js")
        const validation = configManager.validate()
        assert.strictEqual(typeof validation.valid, "boolean")
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      const averageTime = totalTime / iterations
      
      // Configuration loading should be reasonable (less than 5ms per load)
      assert.strictEqual(averageTime < 5, true, `Configuration loading time ${averageTime.toFixed(2)}ms is too slow`)
      
      console.log(`Configuration performance: ${iterations} loads in ${totalTime.toFixed(2)}ms (avg: ${averageTime.toFixed(2)}ms)`)
    })
  })
  
  void describe("Stress Tests", () => {
    void test("should handle rapid sequential requests", async () => {
      const mockAsyncOperation = async (id: number) => {
        // Simulate varying response times
        const delay = Math.random() * 20
        await new Promise(resolve => setTimeout(resolve, delay))
        return { id, processed: true, delay }
      }
      
      const requestCount = 200
      const startTime = performance.now()
      
      // Sequential processing
      const results = []
      for (let i = 0; i < requestCount; i++) {
        const result = await mockAsyncOperation(i)
        results.push(result)
      }
      
      const endTime = performance.now()
      const totalTime = endTime - startTime
      
      // Verify all requests completed
      assert.strictEqual(results.length, requestCount)
      results.forEach((result, index) => {
        assert.strictEqual(result.id, index)
        assert.strictEqual(result.processed, true)
      })
      
      console.log(`Sequential stress test: ${requestCount} requests in ${totalTime.toFixed(2)}ms`)
      
      // Should complete in reasonable time (less than 10 seconds)
      assert.strictEqual(totalTime < 10000, true, `Sequential processing took too long: ${totalTime.toFixed(2)}ms`)
    })
  })
})