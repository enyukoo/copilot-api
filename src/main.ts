#!/usr/bin/env node

import { defineCommand, runMain } from "citty"

import { auth } from "./auth.js"
import { checkUsage } from "./check-usage.js"
import { debug } from "./debug.js"
import { start } from "./start.js"

const main = defineCommand({
  meta: {
    name: "copilot-api",
    description:
      "A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools.",
  },
  subCommands: { auth, start, "check-usage": checkUsage, debug },
})

await runMain(main)
