import consola from "consola"

import { configManager } from "./config.js"

interface ShutdownHandler {
  name: string
  handler: () => Promise<void> | void
  timeout?: number
}

class GracefulShutdown {
  private handlers: ShutdownHandler[] = []
  private isShuttingDown = false
  private server?: { close: () => Promise<void> }
  
  constructor() {
    this.setupSignalHandlers()
  }
  
  private setupSignalHandlers() {
    // Handle different shutdown signals
    process.on("SIGTERM", () => {
      consola.info("Received SIGTERM, starting graceful shutdown...")
      this.shutdown("SIGTERM")
    })
    
    process.on("SIGINT", () => {
      consola.info("Received SIGINT (Ctrl+C), starting graceful shutdown...")
      this.shutdown("SIGINT")
    })
    
    process.on("SIGUSR2", () => {
      consola.info("Received SIGUSR2, starting graceful shutdown...")
      this.shutdown("SIGUSR2")
    })
    
    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      consola.error("Uncaught exception:", error)
      this.shutdown("UNCAUGHT_EXCEPTION", 1)
    })
    
    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      consola.error("Unhandled promise rejection at:", promise, "reason:", reason)
      this.shutdown("UNHANDLED_REJECTION", 1)
    })
  }
  
  // Register a shutdown handler
  register(handler: ShutdownHandler) {
    this.handlers.push(handler)
    consola.debug(`Registered shutdown handler: ${handler.name}`)
  }
  
  // Register the server instance for graceful close
  registerServer(server: { close: () => Promise<void> }) {
    this.server = server
  }
  
  // Perform graceful shutdown
  private async shutdown(signal: string, exitCode = 0) {
    if (this.isShuttingDown) {
      consola.warn("Shutdown already in progress, forcing exit...")
      process.exit(1)
    }
    
    this.isShuttingDown = true
    consola.info(`Starting graceful shutdown (signal: ${signal})...`)
    
    const shutdownTimeout = configManager.get("HEALTH_CHECK_TIMEOUT", 5000)
    const shutdownTimer = setTimeout(() => {
      consola.error("Shutdown timeout reached, forcing exit...")
      process.exit(1)
    }, shutdownTimeout)
    
    try {
      // Run all shutdown handlers in parallel with individual timeouts
      const handlerPromises = this.handlers.map(async handler => {
        const timeout = handler.timeout || 3000
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error(`Timeout: ${handler.name}`)), timeout)
        })
        
        try {
          consola.debug(`Running shutdown handler: ${handler.name}`)
          await Promise.race([
            Promise.resolve(handler.handler()),
            timeoutPromise
          ])
          consola.debug(`Completed shutdown handler: ${handler.name}`)
        } catch (error) {
          consola.error(`Error in shutdown handler ${handler.name}:`, error)
        }
      })
      
      await Promise.allSettled(handlerPromises)
      
      // Close the server if registered
      if (this.server) {
        consola.debug("Closing server...")
        await this.server.close()
        consola.debug("Server closed")
      }
      
      clearTimeout(shutdownTimer)
      consola.info("Graceful shutdown completed")
      process.exit(exitCode)
      
    } catch (error) {
      clearTimeout(shutdownTimer)
      consola.error("Error during graceful shutdown:", error)
      process.exit(1)
    }
  }
  
  // Force shutdown (for testing)
  forceShutdown(exitCode = 0) {
    consola.warn("Forcing immediate shutdown...")
    process.exit(exitCode)
  }
}

// Create singleton instance
export const gracefulShutdown = new GracefulShutdown()

// Convenience functions for registering common shutdown handlers
export function onShutdown(name: string, handler: () => Promise<void> | void, timeout?: number) {
  gracefulShutdown.register({ name, handler, timeout })
}

export function registerCleanupTask(name: string, task: () => Promise<void> | void) {
  onShutdown(name, task)
}

// Built-in shutdown handlers
export function setupDefaultShutdownHandlers() {
  // Clean up temporary files
  onShutdown("cleanup-temp", async () => {
    // Add any temp file cleanup logic here
    consola.debug("Cleaning up temporary files...")
  })
  
  // Flush logs
  onShutdown("flush-logs", async () => {
    consola.debug("Flushing logs...")
    // Force flush any pending log messages
  })
  
  // Close database connections (if any)
  onShutdown("close-db", async () => {
    consola.debug("Closing database connections...")
    // Add database cleanup logic here
  })
  
  // Stop background tasks
  onShutdown("stop-background-tasks", async () => {
    consola.debug("Stopping background tasks...")
    // Add background task cleanup logic here
  })
}