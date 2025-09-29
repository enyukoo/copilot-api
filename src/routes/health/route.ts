import { Hono } from "hono"

import { state } from "../../lib/state.js"

export const healthRoute = new Hono()

interface HealthStatus {
  status: "healthy" | "unhealthy" 
  timestamp: string
  version: string
  uptime: number
  services: {
    github_auth: "connected" | "disconnected" | "error"
    copilot_api: "connected" | "disconnected" | "error"
    models: "available" | "unavailable" | "error"
  }
  memory?: {
    used: number
    total: number
    percentage: number
  }
}

healthRoute.get("/", async (c) => {
  try {
    const startTime = Date.now()
    
    // Check GitHub authentication status
    const githubAuth = state.githubToken ? "connected" : "disconnected"
    
    // Check Copilot API status
    const copilotApi = state.copilotToken ? "connected" : "disconnected"
    
    // Check models availability
    const modelsStatus = state.models?.data ? "available" : "unavailable"
    
    // Get memory usage
    const memUsage = process.memoryUsage()
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    }
    
    // Determine overall health status
    const isHealthy = githubAuth === "connected" && 
                     copilotApi === "connected" && 
                     modelsStatus === "available"
    
    const health: HealthStatus = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: Math.floor(process.uptime()),
      services: {
        github_auth: githubAuth,
        copilot_api: copilotApi,
        models: modelsStatus
      },
      memory
    }
    
    const responseTime = Date.now() - startTime
    
    return c.json({
      ...health,
      response_time_ms: responseTime
    }, isHealthy ? 200 : 503)
    
  } catch (error) {
    console.error("Health check error:", error)
    
    const errorHealth: HealthStatus = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: Math.floor(process.uptime()),
      services: {
        github_auth: "error",
        copilot_api: "error", 
        models: "error"
      }
    }
    
    return c.json({
      ...errorHealth,
      error: error instanceof Error ? error.message : "Unknown error"
    }, 503)
  }
})

// Detailed health check with more comprehensive diagnostics
healthRoute.get("/detailed", async (c) => {
  try {
    const startTime = Date.now()
    
    // Get memory usage
    const memUsage = process.memoryUsage()
    const memory = {
      used: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
      total: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100)
    }
    
    // Check service statuses
    const githubAuth = state.githubToken ? "connected" : "disconnected"
    const copilotApi = state.copilotToken ? "connected" : "disconnected"
    const modelsStatus = state.models?.data ? "available" : "unavailable"
    
    const isHealthy = githubAuth === "connected" && 
                     copilotApi === "connected" && 
                     modelsStatus === "available"
    
    const detailed = {
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || "unknown",
      uptime: Math.floor(process.uptime()),
      services: {
        github_auth: githubAuth,
        copilot_api: copilotApi,
        models: modelsStatus
      },
      memory,
      process: {
        pid: process.pid,
        platform: process.platform,
        arch: process.arch,
        node_version: process.version,
        uptime_seconds: process.uptime()
      },
      environment: {
        node_env: process.env.NODE_ENV || "unknown",
        port: process.env.PORT || "unknown"
      },
      rate_limiting: {
        enabled: !!state.rateLimitSeconds,
        seconds: state.rateLimitSeconds || null,
        wait_on_limit: state.rateLimitWait
      },
      features: {
        manual_approval: state.manualApprove,
        verbose_logging: process.env.LOG_LEVEL === "debug",
        account_type: state.accountType
      }
    }
    
    const responseTime = Date.now() - startTime
    return c.json({
      ...detailed,
      response_time_ms: responseTime
    })
    
  } catch (error) {
    console.error("Detailed health check error:", error)
    return c.json({
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    }, 503)
  }
})