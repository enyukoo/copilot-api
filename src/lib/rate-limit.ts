import consola from "consola"

import type { State } from "./state.js"

import { HTTPError } from "./error.js"
import { sleep } from "./utils.js"

export async function checkRateLimit(state: State) {
  const now = Date.now()

  if (!state.lastRequestTimestamp) {
    state.lastRequestTimestamp = now
    return
  }

  const elapsedSeconds = (now - state.lastRequestTimestamp) / 1000

  if (
    (state.rateLimitSeconds ?? 0) > 0
    && elapsedSeconds > (state.rateLimitSeconds ?? 0)
  ) {
    state.lastRequestTimestamp = now
    return
  }

  const waitTimeSeconds = Math.ceil(
    (state.rateLimitSeconds ?? 0) - elapsedSeconds,
  )

  if (!state.rateLimitWait) {
    consola.warn(
      `Rate limit exceeded. Need to wait ${waitTimeSeconds} more seconds.`,
    )
    throw new HTTPError(
      "Rate limit exceeded",
      Response.json({ message: "Rate limit exceeded" }, { status: 429 }),
    )
  }

  const waitTimeMs = waitTimeSeconds * 1000
  consola.warn(
    `Rate limit reached. Waiting ${waitTimeSeconds} seconds before proceeding...`,
  )
  await sleep(waitTimeMs)
  // eslint-disable-next-line require-atomic-updates
  state.lastRequestTimestamp = now
  consola.info("Rate limit wait completed, proceeding with request")
  return
}
