import assert from "node:assert"
import { describe, test } from "node:test"

import { gracefulShutdown, onShutdown } from "../../src/lib/graceful-shutdown.js"

void describe("Graceful Shutdown", () => {
  void test("should register shutdown handlers", () => {
    let handlerCalled = false
    
    onShutdown("test-handler", () => {
      handlerCalled = true
    })
    
    // The handler should be registered but not called yet
    assert.strictEqual(handlerCalled, false)
  })
  
  void test("should register cleanup tasks", () => {
    let cleanupCalled = false
    
    gracefulShutdown.register({
      name: "test-cleanup",
      handler: () => {
        cleanupCalled = true
      }
    })
    
    // The cleanup should be registered but not called yet
    assert.strictEqual(cleanupCalled, false)
  })
  
  void test("should register server for graceful close", () => {
    const mockServer = {
      close: async () => {
        // Mock server close
      }
    }
    
    // Should not throw when registering server
    assert.doesNotThrow(() => {
      gracefulShutdown.registerServer(mockServer)
    })
  })
  
  void test("should handle shutdown handler registration", () => {
    const handler = {
      name: "test-handler-with-timeout",
      handler: () => {
        // Mock handler
      },
      timeout: 5000
    }
    
    // Should not throw when registering handler
    assert.doesNotThrow(() => {
      gracefulShutdown.register(handler)
    })
  })
})