#!/usr/bin/env node

import { defineCommand } from "citty"
import consola from "consola"
import fs from "node:fs/promises"

import { PATHS, ensurePaths } from "./lib/paths.js"
import { state } from "./lib/state.js"
import { setupGitHubToken } from "./lib/token.js"
import { getGitHubUser } from "./services/github/get-user.js"

interface RunAuthOptions {
  verbose: boolean
  showToken: boolean
  force: boolean
}

async function displayUserInfo(): Promise<void> {
  try {
    const user = await getGitHubUser()
    consola.success("Authenticated as:", {
      login: user.login,
      name: user.name || "No name set",
      email: user.email || "Email private",
      plan: user.plan?.name || "Unknown plan",
      id: user.id
    })
  } catch (error) {
    consola.warn("Could not fetch user information:", error)
  }
}

async function displayTokenStatus(showToken: boolean): Promise<void> {
  try {
    const tokenContent = await fs.readFile(PATHS.GITHUB_TOKEN_PATH, 'utf8')
    const token = tokenContent.trim()
    
    if (showToken) {
      consola.info("GitHub Token:", token)
    } else {
      const maskedToken = token.slice(0, 4) + '•'.repeat(Math.max(0, token.length - 8)) + token.slice(-4)
      consola.info("GitHub Token:", maskedToken, "(use --show-token to reveal)")
    }
    
    consola.info("Token stored at:", PATHS.GITHUB_TOKEN_PATH)
  } catch (error) {
    consola.error("Could not read token file:", error)
  }
}

export async function runAuth(options: RunAuthOptions): Promise<void> {
  if (options.verbose) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  }

  state.showToken = options.showToken

  try {
    await ensurePaths()
    
    // Check if token exists and force flag is not set
    if (!options.force) {
      try {
        const existingToken = await fs.readFile(PATHS.GITHUB_TOKEN_PATH, 'utf8')
        if (existingToken.trim()) {
          consola.info("Existing GitHub token found")
          await displayUserInfo()
          await displayTokenStatus(options.showToken)
          
          const shouldReauth = await consola.prompt(
            "Do you want to re-authenticate?",
            { type: "confirm", initial: false }
          )
          
          if (!shouldReauth) {
            consola.info("Authentication skipped. Use --force to force re-authentication.")
            return
          }
        }
      } catch {
        // Token doesn't exist, continue with authentication
      }
    }
    
    consola.info("Starting GitHub OAuth device flow...")
    await setupGitHubToken({ force: true })
    
    consola.success("✅ GitHub authentication completed!")
    consola.success("Token stored at:", PATHS.GITHUB_TOKEN_PATH)
    
    // Display user information and token status
    await displayUserInfo()
    await displayTokenStatus(options.showToken)
    
  } catch (error) {
    consola.error("Authentication failed:", error)
    process.exit(1)
  }
}

export const auth = defineCommand({
  meta: {
    name: "auth",
    description: "Run GitHub OAuth device flow authentication",
  },
  args: {
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
    "show-token": {
      type: "boolean",
      default: false,
      description: "Show GitHub token instead of masking it",
    },
    force: {
      alias: "f",
      type: "boolean",
      default: false,
      description: "Force re-authentication even if token exists",
    },
  },
  run({ args }) {
    return runAuth({
      verbose: args.verbose,
      showToken: args["show-token"],
      force: args.force,
    })
  },
})
