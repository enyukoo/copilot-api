import { Hono } from "hono"
import { setupEnvironment, selectModel, generateScript, getClaudeCodeCommand, getConfig } from "../../lib/claude-code.js"

const app = new Hono()

// Claude Code integration endpoints
app.post("/setup", setupEnvironment)
app.post("/select-model", selectModel)
app.get("/script", generateScript)
app.get("/command", getClaudeCodeCommand)
app.get("/config", getConfig)

export default app