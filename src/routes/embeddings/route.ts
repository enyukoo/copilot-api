import { Hono } from "hono"

import { forwardError } from "../../lib/error.js"
import {
  createEmbeddings,
  type EmbeddingRequest,
} from "../../services/copilot/create-embeddings.js"

export const embeddingRoutes = new Hono()

embeddingRoutes.post("/", async (c) => {
  try {
    const paylod = await c.req.json<EmbeddingRequest>()
    const response = await createEmbeddings(paylod)

    return c.json(response)
  } catch (error) {
    return await forwardError(c, error)
  }
})
