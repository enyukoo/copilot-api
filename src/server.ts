import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"
import { readFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { errorBoundary } from "./lib/error.js"
import { createMetricsHandler, performanceMonitoring } from "./lib/monitoring.js"
import { addRateLimitHeaders } from "./lib/validation.js"
import { completionRoutes } from "./routes/chat-completions/route.js"
import { embeddingRoutes } from "./routes/embeddings/route.js"
import { healthRoute } from "./routes/health/route.js"
import { messageRoutes } from "./routes/messages/route.js"
import { modelRoutes } from "./routes/models/route.js"
import { tokenRoute } from "./routes/token/route.js"
import { usageRoute } from "./routes/usage/route.js"
import analyticsRoute from "./routes/analytics/route.js"
import claudeCodeRoute from "./routes/claude-code/route.js"

export const server = new Hono()

// Global middleware
server.use(errorBoundary())
server.use(performanceMonitoring())
server.use(logger())
server.use(cors())
server.use(addRateLimitHeaders())

server.get("/", (c) => c.text("Server running"))

// Dashboard endpoint
server.get("/dashboard", async (c) => {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const dashboardPath = join(__dirname, "..", "pages", "dashboard.html")
    const dashboardHtml = await readFile(dashboardPath, "utf-8")
    return c.html(dashboardHtml)
  } catch (error) {
    // Fallback if file reading fails
    return c.html(`
      <!DOCTYPE html>
      <html><head><title>Usage Dashboard</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <h1>🤖 Copilot API Usage Dashboard</h1>
        <p><strong>Error:</strong> Dashboard file not found. Using fallback.</p>
        <div style="margin: 20px 0;">
          <h3>Quick Links:</h3>
          <ul>
            <li><a href="/health">Health Status</a></li>
            <li><a href="/usage">Usage Information</a></li>
            <li><a href="/v1/models">Available Models</a></li>
            <li><a href="/token">Token Status</a></li>
          </ul>
        </div>
        <script>
          // Auto-redirect to external dashboard if available
          const serverUrl = window.location.origin;
          const externalDashboard = 'https://ericc-ch.github.io/copilot-api?endpoint=' + encodeURIComponent(serverUrl);
          document.body.innerHTML += '<p><a href="' + externalDashboard + '" target="_blank">🌐 Open External Dashboard</a></p>';
        </script>
      </body></html>
    `)
  }
})

// Health check endpoints
server.route("/health", healthRoute)

// Metrics endpoint
server.get("/metrics", createMetricsHandler())

// Analytics endpoints
server.route("/analytics", analyticsRoute)

// Claude Code integration endpoints
server.route("/claude-code", claudeCodeRoute)

server.route("/chat/completions", completionRoutes)
server.route("/models", modelRoutes)
server.route("/embeddings", embeddingRoutes)
server.route("/usage", usageRoute)
server.route("/token", tokenRoute)

// Compatibility with tools that expect v1/ prefix
server.route("/v1/chat/completions", completionRoutes)
server.route("/v1/models", modelRoutes)
server.route("/v1/embeddings", embeddingRoutes)

// Anthropic compatible endpoints
server.route("/v1/messages", messageRoutes)
server.post("/v1/messages/count_tokens", (c) => c.json({ input_tokens: 1 }))
