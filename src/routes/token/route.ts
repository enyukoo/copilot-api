import { Hono } from "hono"

import { forwardError } from "../../lib/error.js"
import { state } from "../../lib/state.js"

export const tokenRoute = new Hono()

interface TokenInfo {
  has_github_token: boolean
  has_copilot_token: boolean
  github_token?: string
  copilot_token?: string
  account_type: string
  last_refresh?: string
  expires_in?: number
}

// Get token information (with optional token visibility)
tokenRoute.get("/", (c) => {
  try {
    const showTokens = c.req.query("show") === "true" || state.showToken
    
    const tokenInfo: TokenInfo = {
      has_github_token: !!state.githubToken,
      has_copilot_token: !!state.copilotToken,
      account_type: state.accountType
    }
    
    // Only include actual tokens if explicitly requested or configured
    if (showTokens) {
      tokenInfo.github_token = state.githubToken
      tokenInfo.copilot_token = state.copilotToken
    }
    
    return c.json(tokenInfo)
  } catch (error) {
    return forwardError(c, error)
  }
})

// Get token status (safe - no actual tokens returned)
tokenRoute.get("/status", (c) => {
  try {
    return c.json({
      github_authenticated: !!state.githubToken,
      copilot_authenticated: !!state.copilotToken,
      account_type: state.accountType,
      manual_approval: state.manualApprove,
      rate_limiting: {
        enabled: !!state.rateLimitSeconds,
        seconds: state.rateLimitSeconds
      }
    })
  } catch (error) {
    return forwardError(c, error)
  }
})

// Health check for token validity (POST to avoid caching)
tokenRoute.post("/validate", async (c) => {
  try {
    const validation = {
      github_token_valid: false,
      copilot_token_valid: false,
      validation_timestamp: new Date().toISOString()
    }
    
    // Basic validation - check if tokens exist and are non-empty
    if (state.githubToken && state.githubToken.length > 0) {
      validation.github_token_valid = true
    }
    
    if (state.copilotToken && state.copilotToken.length > 0) {
      validation.copilot_token_valid = true
    }
    
    const isValid = validation.github_token_valid && validation.copilot_token_valid
    
    return c.json({
      ...validation,
      overall_valid: isValid
    }, isValid ? 200 : 401)
    
  } catch (error) {
    return forwardError(c, error)
  }
})
