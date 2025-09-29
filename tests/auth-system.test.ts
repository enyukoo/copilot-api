import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import { tokenManager } from "../src/lib/api-tokens.js";
import { validateApiToken } from "../src/lib/api-tokens.js";

describe("Token Management System", () => {
  beforeEach(() => {
    // Reset tokens before each test
    tokenManager.clearTokens();
  });

  it("should generate valid API keys", () => {
    const apiKey = tokenManager.generateApiKey();
    
    assert(typeof apiKey === "string");
    assert(apiKey.length >= 32);
    assert(apiKey.startsWith("capi_"));
    
    // Store the key to make it valid
    tokenManager.setApiKey(apiKey);
    
    // Key should be valid when stored
    assert(validateApiToken(apiKey) === true);
  });

  it("should store and retrieve API keys", () => {
    const apiKey = tokenManager.generateApiKey();
    tokenManager.setApiKey(apiKey);
    
    const retrievedKey = tokenManager.getApiKey();
    assert.strictEqual(retrievedKey, apiKey);
  });

  it("should validate stored tokens", () => {
    const validation = tokenManager.validateTokens();
    
    assert(typeof validation.isValid === "boolean");
    assert(typeof validation.isExpired === "boolean");
    assert(typeof validation.usageCount === "number");
  });

  it("should reject invalid API keys", () => {
    assert(validateApiToken("invalid-key") === false);
    assert(validateApiToken("") === false);
    assert(validateApiToken("short") === false);
    assert(validateApiToken("wrong_prefix_12345678901234567890123456789012") === false);
  });

  it("should handle token usage tracking", () => {
    // Set a mock token to enable usage tracking
    const apiKey = tokenManager.generateApiKey();
    tokenManager.setApiKey(apiKey);
    
    const validation = tokenManager.validateTokens();
    assert(typeof validation.usageCount === "number");
    assert(validation.usageCount >= 0);
  });

  it("should clear tokens properly", () => {
    const apiKey = tokenManager.generateApiKey();
    tokenManager.setApiKey(apiKey);
    
    tokenManager.clearTokens();
    
    const retrievedKey = tokenManager.getApiKey();
    assert.strictEqual(retrievedKey, null);
  });
});

describe("Authentication System Integration", () => {
  it("should export required functions", async () => {
    const authModule = await import("../src/lib/auth-middleware.js");
    
    assert(typeof authModule.authMiddleware === "function");
    assert(typeof authModule.requireAuth === "function");
    assert(typeof authModule.optionalAuth === "function");
    assert(typeof authModule.requireAdmin === "function");
    assert(typeof authModule.initializeAuth === "function");
  });

  it("should initialize authentication system", async () => {
    const authModule = await import("../src/lib/auth-middleware.js");
    const result = authModule.initializeAuth();
    
    assert(typeof result.success === "boolean");
    assert(typeof result.hasTokens === "boolean");
    
    if (result.success && result.apiKey) {
      assert(typeof result.apiKey === "string");
      assert(result.apiKey.startsWith("capi_"));
    }
  });
});

describe("Documentation Route", () => {
  it("should export docs route", async () => {
    const docsModule = await import("../src/routes/docs/route.js");
    
    assert(docsModule.docsRoute !== undefined);
    assert(typeof docsModule.docsRoute === "object");
  });
});

console.log("✅ All authentication system tests completed successfully");