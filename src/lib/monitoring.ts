import type { Context, Next } from "hono"

import consola from "consola"

import { configManager } from "./config.js"

interface PerformanceMetrics {
  requests: {
    total: number
    success: number
    error: number
    by_endpoint: Record<string, number>
    by_method: Record<string, number>
    by_status: Record<number, number>
  }
  timing: {
    average_response_time: number
    min_response_time: number
    max_response_time: number
    response_times: number[]
  }
  system: {
    memory_usage: NodeJS.MemoryUsage
    uptime: number
    cpu_usage?: number
  }
  errors: {
    total: number
    by_type: Record<string, number>
    recent: Array<{
      timestamp: string
      error: string
      path: string
      method: string
    }>
  }
}

class MetricsCollector {
  private metrics: PerformanceMetrics = {
    requests: {
      total: 0,
      success: 0,
      error: 0,
      by_endpoint: {},
      by_method: {},
      by_status: {}
    },
    timing: {
      average_response_time: 0,
      min_response_time: Infinity,
      max_response_time: 0,
      response_times: []
    },
    system: {
      memory_usage: process.memoryUsage(),
      uptime: 0
    },
    errors: {
      total: 0,
      by_type: {},
      recent: []
    }
  }

  private startTime = Date.now()

  // Record a request
  recordRequest(
    method: string, 
    path: string, 
    status: number, 
    responseTime: number,
    error?: Error
  ) {
    this.metrics.requests.total++
    
    // Track by method
    this.metrics.requests.by_method[method] = (this.metrics.requests.by_method[method] || 0) + 1
    
    // Track by endpoint (normalize path)
    const normalizedPath = this.normalizePath(path)
    this.metrics.requests.by_endpoint[normalizedPath] = 
      (this.metrics.requests.by_endpoint[normalizedPath] || 0) + 1
    
    // Track by status
    this.metrics.requests.by_status[status] = (this.metrics.requests.by_status[status] || 0) + 1
    
    // Track success/error
    if (status >= 200 && status < 400) {
      this.metrics.requests.success++
    } else {
      this.metrics.requests.error++
    }
    
    // Track response times
    this.recordResponseTime(responseTime)
    
    // Track errors
    if (error) {
      this.recordError(error, path, method)
    }
    
    // Update system metrics
    this.updateSystemMetrics()
  }

  private recordResponseTime(responseTime: number) {
    this.metrics.timing.response_times.push(responseTime)
    
    // Keep only last 1000 response times
    if (this.metrics.timing.response_times.length > 1000) {
      this.metrics.timing.response_times.shift()
    }
    
    // Update min/max
    this.metrics.timing.min_response_time = Math.min(
      this.metrics.timing.min_response_time, 
      responseTime
    )
    this.metrics.timing.max_response_time = Math.max(
      this.metrics.timing.max_response_time, 
      responseTime
    )
    
    // Update average
    const times = this.metrics.timing.response_times
    this.metrics.timing.average_response_time = 
      times.reduce((sum, time) => sum + time, 0) / times.length
  }

  private recordError(error: Error, path: string, method: string) {
    this.metrics.errors.total++
    
    // Track by error type
    const errorType = error.constructor.name
    this.metrics.errors.by_type[errorType] = (this.metrics.errors.by_type[errorType] || 0) + 1
    
    // Track recent errors (keep last 100)
    this.metrics.errors.recent.push({
      timestamp: new Date().toISOString(),
      error: error.message,
      path,
      method
    })
    
    if (this.metrics.errors.recent.length > 100) {
      this.metrics.errors.recent.shift()
    }
  }

  private updateSystemMetrics() {
    this.metrics.system.memory_usage = process.memoryUsage()
    this.metrics.system.uptime = (Date.now() - this.startTime) / 1000
  }

  private normalizePath(path: string): string {
    // Remove query parameters
    const cleanPath = path.split('?')[0]
    
    // Replace common patterns with placeholders
    return cleanPath
      .replace(/\/\d+/g, '/:id')
      .replace(/\/[a-f0-9-]{36}/g, '/:uuid')
      .replace(/\/[a-zA-Z0-9_-]{20,}/g, '/:token')
  }

  // Get current metrics
  getMetrics(): PerformanceMetrics {
    this.updateSystemMetrics()
    return { ...this.metrics }
  }

  // Reset metrics
  reset() {
    this.metrics = {
      requests: {
        total: 0,
        success: 0,
        error: 0,
        by_endpoint: {},
        by_method: {},
        by_status: {}
      },
      timing: {
        average_response_time: 0,
        min_response_time: Infinity,
        max_response_time: 0,
        response_times: []
      },
      system: {
        memory_usage: process.memoryUsage(),
        uptime: 0
      },
      errors: {
        total: 0,
        by_type: {},
        recent: []
      }
    }
    this.startTime = Date.now()
  }

  // Get metrics summary
  getSummary() {
    const metrics = this.getMetrics()
    return {
      total_requests: metrics.requests.total,
      success_rate: metrics.requests.total > 0 ? 
        (metrics.requests.success / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      error_rate: metrics.requests.total > 0 ? 
        (metrics.requests.error / metrics.requests.total * 100).toFixed(2) + '%' : '0%',
      average_response_time: Math.round(metrics.timing.average_response_time) + 'ms',
      memory_usage: Math.round(metrics.system.memory_usage.heapUsed / 1024 / 1024) + 'MB',
      uptime: Math.round(metrics.system.uptime) + 's',
      top_endpoints: Object.entries(metrics.requests.by_endpoint)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 5)
        .map(([path, count]) => ({ path, count }))
    }
  }
}

// Global metrics collector instance
export const metricsCollector = new MetricsCollector()

// Performance monitoring middleware
export function performanceMonitoring() {
  if (!configManager.get("ENABLE_METRICS", false)) {
    // Return no-op middleware if metrics disabled
    return async (_c: Context, next: Next) => {
      await next()
    }
  }

  return async (c: Context, next: Next) => {
    const startTime = Date.now()
    let error: Error | undefined

    try {
      await next()
    } catch (err) {
      error = err as Error
      throw err
    } finally {
      const responseTime = Date.now() - startTime
      const status = c.res.status
      const method = c.req.method
      const path = c.req.path

      // Record metrics
      metricsCollector.recordRequest(method, path, status, responseTime, error)

      // Add performance headers if in development
      if (configManager.isDevelopment()) {
        c.header("X-Response-Time", `${responseTime}ms`)
        c.header("X-Request-ID", c.get("requestId") || "unknown")
      }
    }
  }
}

// Metrics endpoint handler
export function createMetricsHandler() {
  return async (c: Context) => {
    const format = c.req.query("format") || "json"
    
    if (format === "prometheus") {
      // Return Prometheus format
      const metrics = metricsCollector.getMetrics()
      const prometheus = convertToPrometheus(metrics)
      return c.text(prometheus, 200, {
        "Content-Type": "text/plain; version=0.0.4; charset=utf-8"
      })
    }
    
    if (format === "summary") {
      return c.json(metricsCollector.getSummary())
    }
    
    // Default JSON format
    return c.json(metricsCollector.getMetrics())
  }
}

// Convert metrics to Prometheus format
function convertToPrometheus(metrics: PerformanceMetrics): string {
  const lines: string[] = []
  
  // Request metrics
  lines.push("# HELP http_requests_total Total number of HTTP requests")
  lines.push("# TYPE http_requests_total counter")
  lines.push(`http_requests_total ${metrics.requests.total}`)
  
  lines.push("# HELP http_requests_success_total Total number of successful HTTP requests")
  lines.push("# TYPE http_requests_success_total counter")
  lines.push(`http_requests_success_total ${metrics.requests.success}`)
  
  lines.push("# HELP http_requests_error_total Total number of failed HTTP requests")
  lines.push("# TYPE http_requests_error_total counter")
  lines.push(`http_requests_error_total ${metrics.requests.error}`)
  
  // Response time metrics
  lines.push("# HELP http_request_duration_ms HTTP request duration in milliseconds")
  lines.push("# TYPE http_request_duration_ms histogram")
  lines.push(`http_request_duration_ms_sum ${metrics.timing.response_times.reduce((sum, time) => sum + time, 0)}`)
  lines.push(`http_request_duration_ms_count ${metrics.timing.response_times.length}`)
  
  // Memory metrics
  lines.push("# HELP process_memory_heap_used_bytes Process memory heap used in bytes")
  lines.push("# TYPE process_memory_heap_used_bytes gauge")
  lines.push(`process_memory_heap_used_bytes ${metrics.system.memory_usage.heapUsed}`)
  
  // Uptime
  lines.push("# HELP process_uptime_seconds Process uptime in seconds")
  lines.push("# TYPE process_uptime_seconds gauge")
  lines.push(`process_uptime_seconds ${metrics.system.uptime}`)
  
  return lines.join("\n") + "\n"
}

// Performance monitoring utilities
export function logPerformanceStats() {
  const summary = metricsCollector.getSummary()
  consola.info("Performance Summary:", summary)
}

export function resetMetrics() {
  metricsCollector.reset()
  consola.info("Performance metrics reset")
}