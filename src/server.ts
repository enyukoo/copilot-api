import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

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

export const server = new Hono()

// Global middleware
server.use(errorBoundary())
server.use(performanceMonitoring())
server.use(logger())
server.use(cors())
server.use(addRateLimitHeaders())

server.get("/", (c) => c.text("Server running"))

// Health check endpoints
server.route("/health", healthRoute)

// Metrics endpoint
server.get("/metrics", createMetricsHandler())

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
