import { type Context } from "hono"

interface AnalyticsData {
  requests: {
    total: number
    success: number
    errors: number
    hourly: Array<{ hour: string; count: number }>
  }
  models: {
    [key: string]: {
      requests: number
      successRate: number
      avgResponseTime: number
      lastUsed: string
    }
  }
  performance: {
    avgResponseTime: number
    uptime: number
    errorRate: number
  }
  users: {
    active: number
    totalRequests: number
  }
}

// In-memory analytics store (in production, use Redis or database)
class AnalyticsStore {
  private data: AnalyticsData = {
    requests: {
      total: 0,
      success: 0,
      errors: 0,
      hourly: Array.from({ length: 24 }, (_, i) => ({
        hour: `${i}:00`,
        count: 0
      }))
    },
    models: {},
    performance: {
      avgResponseTime: 0,
      uptime: Date.now(),
      errorRate: 0
    },
    users: {
      active: 0,
      totalRequests: 0
    }
  }

  private requestTimes: number[] = []
  private maxRequestTimes = 1000

  recordRequest(model: string, responseTime: number, success: boolean, userId?: string) {
    // Update total requests
    this.data.requests.total++
    if (success) {
      this.data.requests.success++
    } else {
      this.data.requests.errors++
    }

    // Update hourly data
    const currentHour = new Date().getHours()
    const hourlyEntry = this.data.requests.hourly.find(h => h.hour === `${currentHour}:00`)
    if (hourlyEntry) {
      hourlyEntry.count++
    }

    // Update model stats
    if (!this.data.models[model]) {
      this.data.models[model] = {
        requests: 0,
        successRate: 100,
        avgResponseTime: 0,
        lastUsed: new Date().toISOString()
      }
    }

    const modelStats = this.data.models[model]
    modelStats.requests++
    modelStats.lastUsed = new Date().toISOString()
    
    // Update success rate
    const totalModelRequests = modelStats.requests
    const successfulRequests = success ? totalModelRequests : totalModelRequests - 1
    modelStats.successRate = (successfulRequests / totalModelRequests) * 100

    // Update response time
    this.requestTimes.push(responseTime)
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift()
    }

    const avgTime = this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length
    modelStats.avgResponseTime = avgTime
    this.data.performance.avgResponseTime = avgTime

    // Update error rate
    this.data.performance.errorRate = (this.data.requests.errors / this.data.requests.total) * 100

    // Update user stats
    if (userId) {
      this.data.users.totalRequests++
    }
  }

  getAnalytics(): AnalyticsData {
    return {
      ...this.data,
      performance: {
        ...this.data.performance,
        uptime: Date.now() - this.data.performance.uptime
      }
    }
  }

  getModelStats() {
    return Object.entries(this.data.models)
      .map(([model, stats]) => ({
        model,
        ...stats
      }))
      .sort((a, b) => b.requests - a.requests)
  }

  getTopModels(limit = 10) {
    return this.getModelStats().slice(0, limit)
  }

  getRequestHistory(hours = 24) {
    const now = new Date()
    const history = []
    
    for (let i = hours - 1; i >= 0; i--) {
      const hour = new Date(now.getTime() - i * 60 * 60 * 1000)
      const hourKey = `${hour.getHours()}:00`
      const hourData = this.data.requests.hourly.find(h => h.hour === hourKey)
      
      history.push({
        timestamp: hour.toISOString(),
        hour: hourKey,
        requests: hourData?.count || 0
      })
    }
    
    return history
  }

  resetHourlyData() {
    // Reset hourly data at the start of each day
    const currentHour = new Date().getHours()
    if (currentHour === 0) {
      this.data.requests.hourly.forEach(h => h.count = 0)
    }
  }
}

export const analyticsStore = new AnalyticsStore()

// Analytics routes
export async function getAnalytics(c: Context) {
  try {
    const analytics = analyticsStore.getAnalytics()
    return c.json(analytics)
  } catch (error) {
    console.error("Error getting analytics:", error)
    return c.json({ error: "Failed to get analytics" }, 500)
  }
}

export async function getModelStats(c: Context) {
  try {
    const stats = analyticsStore.getModelStats()
    return c.json({ models: stats })
  } catch (error) {
    console.error("Error getting model stats:", error)
    return c.json({ error: "Failed to get model stats" }, 500)
  }
}

export async function getRequestHistory(c: Context) {
  try {
    const hours = parseInt(c.req.query('hours') || '24')
    const history = analyticsStore.getRequestHistory(hours)
    return c.json({ history })
  } catch (error) {
    console.error("Error getting request history:", error)
    return c.json({ error: "Failed to get request history" }, 500)
  }
}

export async function getTopModels(c: Context) {
  try {
    const limit = parseInt(c.req.query('limit') || '10')
    const models = analyticsStore.getTopModels(limit)
    return c.json({ models })
  } catch (error) {
    console.error("Error getting top models:", error)
    return c.json({ error: "Failed to get top models" }, 500)
  }
}

// Middleware to track requests
export function trackRequest(model: string, startTime: number, success: boolean, userId?: string) {
  const responseTime = Date.now() - startTime
  analyticsStore.recordRequest(model, responseTime, success, userId)
}

// Reset hourly data daily
setInterval(() => {
  analyticsStore.resetHourlyData()
}, 60 * 60 * 1000) // Check every hour