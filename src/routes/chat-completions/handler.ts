import type { Context } from "hono"

import consola from "consola"
import { streamSSE, type SSEMessage } from "hono/streaming"

import type {
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "../../services/copilot/create-chat-completions.js"

import { awaitApproval } from "../../lib/approval.js"
import { HTTPError } from "../../lib/error.js"
// import { checkRateLimit } from "../../lib/rate-limit.js"
import { state } from "../../lib/state.js"
import { getTokenCount } from "../../lib/tokenizer.js"
import { isNullish } from "../../lib/utils.js"
import { createChatCompletions } from "../../services/copilot/create-chat-completions.js"
import { trackRequest } from "../../lib/analytics.js"
import { trackPerformance } from "../../lib/performance-tracker.js"

export async function handleCompletion(c: Context) {
  const startTime = Date.now()
  let payload: ChatCompletionsPayload
  
  try {
    // Temporarily disable rate limiting for testing
    // await checkRateLimit(state)
    
    // Use manual JSON parsing to avoid Hono request body issues
    const bodyText = await c.req.text()
    if (!bodyText.trim()) {
      throw new Error("Empty request body")
    }
    
    payload = JSON.parse(bodyText) as ChatCompletionsPayload
  } catch (err) {
    consola.warn("Invalid JSON payload", err)
    throw new HTTPError(
      "Invalid JSON payload", 
      Response.json({ message: `Invalid JSON payload: ${(err as any)?.message || err}` }, { status: 400 }),
    )
  }
  consola.debug("Request payload:", JSON.stringify(payload).slice(-400))

  if (!Array.isArray(payload.messages) || !payload.model) {
    consola.warn("Bad request payload", payload)
    throw new HTTPError(
      "Bad request",
      Response.json(
        { message: "Missing required fields: messages and model" },
        { status: 400 },
      ),
    )
  }

  consola.info("Current token count:", getTokenCount(payload.messages))

  if (state.manualApprove) await awaitApproval()

  if (isNullish(payload.max_tokens)) {
    const selectedModel = state.models?.data.find(
      (model) => model.id === payload.model,
    )

    payload = {
      ...payload,
      max_tokens: selectedModel?.capabilities.limits.max_output_tokens,
    }
    consola.debug("Set max_tokens to:", JSON.stringify(payload.max_tokens))
  }

  try {
    const response = await createChatCompletions(payload)

    // Track successful request and performance
    trackRequest(payload.model, startTime, true)
    trackPerformance(payload.model, startTime, true)

    if (isNonStreaming(response)) {
      consola.debug("Non-streaming response:", JSON.stringify(response))
      return c.json(response)
    }

    consola.debug("Streaming response")
    return streamSSE(c, async (stream) => {
      for await (const chunk of response) {
        consola.debug("Streaming chunk:", JSON.stringify(chunk))
        await stream.writeSSE(chunk as SSEMessage)
      }
    })
  } catch (error) {
    // Track failed request and performance
    trackRequest(payload.model, startTime, false)
    trackPerformance(payload.model, startTime, false)
    throw error
  }
}

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => Object.hasOwn(response, "choices")
