import { Hono } from "hono"
import { createChatCompletions } from "./src/services/copilot/create-chat-completions.js"
import { state } from "./src/lib/state.js"

const app = new Hono()

app.post("/test", async (c) => {
  try {
    console.log("=== TEST HANDLER ===")
    const body = await c.req.json()
    console.log("Received body:", JSON.stringify(body, null, 2))
    
    if (!body.model || !body.messages) {
      return c.json({ error: "Missing model or messages" }, 400)
    }
    
    console.log("Calling createChatCompletions...")
    const result = await createChatCompletions(state, body)
    console.log("Result received:", result.choices?.[0]?.message?.content?.slice(0, 50))
    
    return c.json(result)
  } catch (error) {
    console.error("Test handler error:", error)
    return c.json({ error: error.message }, 500)
  }
})

export default {
  port: 4142,
  fetch: app.fetch,
}