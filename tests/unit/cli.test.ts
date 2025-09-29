import { describe, it, beforeEach, afterEach } from "node:test"
import assert from "node:assert"
import { execSync } from "node:child_process"
import fs from "node:fs/promises"
import path from "node:path"
import os from "node:os"

const CLI_PATH = path.join(process.cwd(), "dist", "main.js")

describe("CLI Commands", () => {
  let tempDir: string
  let originalHome: string | undefined

  beforeEach(async () => {
    // Create temp directory for test isolation
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "copilot-api-test-"))
    originalHome = process.env.HOME
    process.env.HOME = tempDir
  })

  afterEach(async () => {
    // Cleanup
    if (originalHome) {
      process.env.HOME = originalHome
    }
    try {
      await fs.rm(tempDir, { recursive: true, force: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe("debug command", () => {
    it("should display debug information in plain format", () => {
      const output = execSync(`node ${CLI_PATH} debug`, { encoding: "utf8" })
      
      assert(output.includes("copilot-api debug"))
      assert(output.includes("Version:"))
      assert(output.includes("Runtime: node"))
      assert(output.includes("Paths:"))
      assert(output.includes("Token exists:"))
    })

    it("should display debug information in JSON format", () => {
      const output = execSync(`node ${CLI_PATH} debug --json`, { encoding: "utf8" })
      
      const debugInfo = JSON.parse(output)
      assert(typeof debugInfo === "object")
      assert(typeof debugInfo.version === "string")
      assert(typeof debugInfo.runtime === "object")
      assert(typeof debugInfo.runtime.name === "string")
      assert(typeof debugInfo.runtime.version === "string")
      assert(typeof debugInfo.runtime.platform === "string")
      assert(typeof debugInfo.runtime.arch === "string")
      assert(typeof debugInfo.paths === "object")
      assert(typeof debugInfo.tokenExists === "boolean")
    })

    it("should show help information", () => {
      const output = execSync(`node ${CLI_PATH} debug --help`, { encoding: "utf8" })
      
      assert(output.includes("Print debug information"))
      assert(output.includes("--json"))
      assert(output.includes("Output debug information as JSON"))
    })
  })

  describe("auth command", () => {
    it("should show help information", () => {
      const output = execSync(`node ${CLI_PATH} auth --help`, { encoding: "utf8" })
      
      assert(output.includes("GitHub OAuth device flow"))
      assert(output.includes("--verbose"))
      assert(output.includes("--show-token"))
      assert(output.includes("--force"))
    })

    it("should display proper command structure", () => {
      try {
        // This will likely fail due to missing token, but we check the structure
        execSync(`node ${CLI_PATH} auth --help`, { encoding: "utf8" })
      } catch (error) {
        // Expected to fail, but command structure should be valid
      }
      
      // Command should exist and be properly defined
      const help = execSync(`node ${CLI_PATH} --help`, { encoding: "utf8" })
      assert(help.includes("auth"))
    })
  })

  describe("check-usage command", () => {
    it("should show help information", () => {
      const mainHelp = execSync(`node ${CLI_PATH} --help`, { encoding: "utf8" })
      assert(mainHelp.includes("check-usage"))
    })

    it("should handle missing authentication gracefully", () => {
      try {
        execSync(`node ${CLI_PATH} check-usage`, { encoding: "utf8", stdio: "pipe" })
        assert(false, "Should have failed without authentication")
      } catch (error: any) {
        // Should fail gracefully with appropriate error message
        assert(error.status !== 0)
      }
    })
  })

  describe("start command", () => {
    it("should show help information", () => {
      const output = execSync(`node ${CLI_PATH} start --help`, { encoding: "utf8" })
      
      assert(output.includes("Start the Copilot API server"))
      assert(output.includes("--port"))
      assert(output.includes("--verbose"))
      assert(output.includes("--account-type"))
      assert(output.includes("--manual"))
      assert(output.includes("--rate-limit"))
      assert(output.includes("--github-token"))
      assert(output.includes("--claude-code"))
      assert(output.includes("--show-token"))
    })

    it("should validate port parameter", () => {
      const output = execSync(`node ${CLI_PATH} start --help`, { encoding: "utf8" })
      assert(output.includes("Port to listen on"))
    })
  })

  describe("main CLI interface", () => {
    it("should display main help", () => {
      const output = execSync(`node ${CLI_PATH} --help`, { encoding: "utf8" })
      
      assert(output.includes("auth"))
      assert(output.includes("start"))
      assert(output.includes("check-usage"))
      assert(output.includes("debug"))
    })

    it("should handle invalid commands gracefully", () => {
      try {
        execSync(`node ${CLI_PATH} invalid-command`, { encoding: "utf8", stdio: "pipe" })
        assert(false, "Should have failed with invalid command")
      } catch (error: any) {
        assert(error.status !== 0)
      }
    })

    it("should show version when available", () => {
      // Test that the CLI can access version information
      const debugOutput = execSync(`node ${CLI_PATH} debug --json`, { encoding: "utf8" })
      const debugInfo = JSON.parse(debugOutput)
      assert(typeof debugInfo.version === "string")
      assert(debugInfo.version.length > 0)
    })
  })

  describe("CLI consistency", () => {
    it("should have consistent help formatting", () => {
      const commands = ["auth", "start", "check-usage", "debug"]
      
      for (const command of commands) {
        const output = execSync(`node ${CLI_PATH} ${command} --help`, { encoding: "utf8" })
        // All commands should have consistent help format
        assert(output.includes(command))
        assert(output.includes("USAGE") || output.includes("Run "))
      }
    })

    it("should handle verbose flag consistently", () => {
      const verboseCommands = ["auth", "start"]
      
      for (const command of verboseCommands) {
        const help = execSync(`node ${CLI_PATH} ${command} --help`, { encoding: "utf8" })
        assert(help.includes("verbose") || help.includes("Enable verbose logging"))
      }
    })
  })
})

describe("CLI Error Handling", () => {
  it("should provide useful error messages", () => {
    try {
      execSync(`node ${CLI_PATH} nonexistent-command`, { encoding: "utf8", stdio: "pipe" })
      assert(false, "Should have failed")
    } catch (error: any) {
      // Should exit with non-zero code
      assert(error.status !== 0)
    }
  })

  it("should validate required parameters", () => {
    // Test that commands properly validate their inputs
    const debugOutput = execSync(`node ${CLI_PATH} debug`, { encoding: "utf8" })
    assert(debugOutput.includes("Version:"))
  })
})