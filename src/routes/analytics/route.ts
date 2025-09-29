import { Hono } from "hono"
import { getAnalytics, getModelStats, getRequestHistory, getTopModels } from "../../lib/analytics.js"

const app = new Hono()

// Analytics endpoints
app.get("/", getAnalytics)
app.get("/models", getModelStats)
app.get("/history", getRequestHistory)
app.get("/top-models", getTopModels)

export default app