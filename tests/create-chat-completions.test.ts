import { test, assert } from "vitest"

import type { ChatCompletionsPayload } from "../src/services/copilot/create-chat-completions.js"

import { state } from "../src/lib/state.js"
import { createChatCompletions } from "../src/services/copilot/create-chat-completions.js"

// Mock state
state.copilotToken = "test-token"
state.vsCodeVersion = "1.0.0"
state.accountType = "individual"

// Helper to mock fetch
type FetchMockCall = [string, { headers: Record<string, string> }]
const fetchMockCalls: Array<FetchMockCall> = []
const fetchMock = async (
  _url: string,
  opts: { headers: Record<string, string> },
): Promise<{
  ok: true
  json: () => { id: string; object: string; choices: Array<unknown> }
  headers: Record<string, string>
}> => {
  await Promise.resolve() // ensure function is truly async for lint
  fetchMockCalls.push([_url, opts])
  return {
    ok: true,
    json: () => ({ id: "123", object: "chat.completion", choices: [] }),
    headers: opts.headers,
  }
}
;(globalThis as unknown as { fetch?: typeof fetchMock }).fetch = fetchMock

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
  const headers = fetchMockCalls[0][1].headers
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
  const headers = fetchMockCalls[1][1].headers
  assert.strictEqual(headers["X-Initiator"], "user")
})
