import { Hono } from "hono"

import { forwardError } from "../../lib/error.js"
import { handleCompletion } from "./handler.js"

export const messageRoutes = new Hono()

messageRoutes.post("/", async (c) => {
  try {
    return await handleCompletion(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})
