import { Hono } from "hono"

import { forwardError } from "../../lib/error.js"
import { handleCompletion } from "./handler.js"

export const completionRoutes = new Hono()

completionRoutes.post("/", async (c) => {
  try {
    return await handleCompletion(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})
