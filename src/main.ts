#!/usr/bin/env node

import { defineCommand, runMain } from "citty"

// Main subcommands for the CLI tool
import { auth } from "./auth.js" // Handles GitHub authentication
import { checkUsage } from "./check-usage.js" // Shows Copilot usage/quota
import { debug } from "./debug.js" // Prints debug info
import { start } from "./start.js" // Starts the API server

// Entrypoint for the CLI
const main = defineCommand({
  meta: {
    name: "copilot-api",
    description:
      "A wrapper around GitHub Copilot API to make it OpenAI compatible, making it usable for other tools.",
  },
  subCommands: { auth, start, "check-usage": checkUsage, debug },
})

// Run the CLI with the defined commands
await runMain(main)
