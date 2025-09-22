import consola from "consola"

import { HTTPError } from "./error.js"

export const awaitApproval = async () => {
  const response = await consola.prompt(`Accept incoming request?`, {
    type: "confirm",
  })

  if (!response)
    throw new HTTPError(
      "Request rejected",
      Response.json({ message: "Request rejected" }, { status: 403 }),
    )
}
