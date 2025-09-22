import assert from "node:assert/strict"
import { test } from "node:test"

import type { ChatCompletionsPayload } from "../src/services/copilot/create-chat-completions.js"

import { state } from "../src/lib/state.js"
import { createChatCompletions } from "../src/services/copilot/create-chat-completions.js"

// Mock state
state.copilotToken = "test-token"
state.vsCodeVersion = "1.0.0"
state.accountType = "individual"

// Helper to mock fetch
// Manual fetch mock for Node.js
const fetchMockCalls: Array<any> = []
const fetchMock = async (
  _url: string,
  opts: { headers: Record<string, string> },
) => {
  fetchMockCalls.push([_url, opts])
  return {
    ok: true,
    json: () => ({ id: "123", object: "chat.completion", choices: [] }),
    headers: opts.headers,
  }
}
;(globalThis as any).fetch = fetchMock

test("sets X-Initiator to agent if tool/assistant present", async () => {
  const payload: ChatCompletionsPayload = {
    messages: [
      { role: "user", content: "hi" },
      { role: "tool", content: "tool call" },
    ],
    model: "gpt-test",
  }
  await createChatCompletions(payload)
  assert.strictEqual(fetchMockCalls.length > 0, true)
  const headers = (fetchMockCalls[0][1] as { headers: Record<string, string> })
    .headers
  assert.strictEqual(headers["X-Initiator"], "agent")
})

test("sets X-Initiator to user if only user present", async () => {
  const payload: ChatCompletionsPayload = {
    messages: [
      { role: "user", content: "hi" },
      { role: "user", content: "hello again" },
    ],
    model: "gpt-test",
  }
  await createChatCompletions(payload)
  assert.strictEqual(fetchMockCalls.length > 1, true)
  const headers = (fetchMockCalls[1][1] as { headers: Record<string, string> })
    .headers
  assert.strictEqual(headers["X-Initiator"], "user")
})
