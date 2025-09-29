import assert from "node:assert"
import { describe, test } from "node:test"

import { configManager } from "../../src/lib/config.js"

void describe("Configuration Management", () => {
  void test("should load default configuration", () => {
    const config = configManager.config
    
    assert.strictEqual(config.PORT, 4141)
    assert.strictEqual(config.NODE_ENV, "development")
    assert.strictEqual(config.LOG_LEVEL, "info")
    assert.strictEqual(config.ACCOUNT_TYPE, "individual")
  })
  
  void test("should provide server configuration", () => {
    const serverConfig = configManager.getServerConfig()
    
    assert.strictEqual(typeof serverConfig.port, "number")
    assert.strictEqual(typeof serverConfig.host, "string")
    assert.strictEqual(typeof serverConfig.nodeEnv, "string")
  })
  
  void test("should provide logging configuration", () => {
    const loggingConfig = configManager.getLoggingConfig()
    
    assert.strictEqual(typeof loggingConfig.level, "string")
    assert.strictEqual(typeof loggingConfig.format, "string")
  })
  
  void test("should validate environment detection", () => {
    assert.strictEqual(typeof configManager.isProduction(), "boolean")
    assert.strictEqual(typeof configManager.isDevelopment(), "boolean")
    assert.strictEqual(typeof configManager.isTest(), "boolean")
  })
  
  void test("should provide configuration summary", () => {
    const summary = configManager.getSummary()
    
    assert.strictEqual(typeof summary.server, "object")
    assert.strictEqual(typeof summary.logging, "object")
    assert.strictEqual(typeof summary.github, "object")
    assert.strictEqual(typeof summary.features, "object")
  })
  
  void test("should validate configuration", () => {
    const validation = configManager.validate()
    
    assert.strictEqual(typeof validation.valid, "boolean")
    assert.strictEqual(Array.isArray(validation.errors), true)
  })
  
  void test("should get configuration values with fallback", () => {
    const port = configManager.get("PORT", 3000)
    const nonExistent = configManager.get("NONEXISTENT" as any, "fallback")
    
    assert.strictEqual(typeof port, "number")
    assert.strictEqual(nonExistent, "fallback")
  })
})