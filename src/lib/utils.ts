import consola from "consola"

import { getModels } from "../services/copilot/get-models.js"
import { getVSCodeVersion } from "../services/get-vscode-version.js"
import { state } from "./state.js"

/**
 * Sleep for a given number of milliseconds (async delay helper).
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Type guard for null or undefined values.
 */
export const isNullish = (value: unknown): value is null | undefined =>
  value === null || value === undefined

/**
 * Fetch and cache available Copilot models in global state.
 */
export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models
}

/**
 * Fetch and cache the current VSCode version in global state.
 * Logs the version for debugging.
 */
export const cacheVSCodeVersion = async () => {
  const response = await getVSCodeVersion()
  state.vsCodeVersion = response
  consola.info(`Using VSCode version: ${response}`)
}
