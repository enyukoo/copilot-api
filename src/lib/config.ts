import { z } from "zod"

// Environment configuration schema
const ConfigSchema = z.object({
  // Server configuration
  PORT: z.coerce.number().default(4141),
  HOST: z.string().default("localhost"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  
  // Logging
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),
  LOG_FORMAT: z.enum(["json", "text"]).default("text"),
  
  // GitHub configuration
  GITHUB_TOKEN: z.string().optional(),
  ACCOUNT_TYPE: z.enum(["individual", "business", "enterprise"]).default("individual"),
  
  // Rate limiting
  RATE_LIMIT_SECONDS: z.coerce.number().optional(),
  RATE_LIMIT_WAIT: z.coerce.boolean().default(false),
  
  // Security
  MANUAL_APPROVAL: z.coerce.boolean().default(false),
  SHOW_TOKENS: z.coerce.boolean().default(false),
  
  // API Configuration
  COPILOT_BASE_URL: z.string().optional(),
  COPILOT_VERSION: z.string().default("0.26.7"),
  
  // Monitoring
  ENABLE_METRICS: z.coerce.boolean().default(false),
  METRICS_PORT: z.coerce.number().default(9090),
  
  // Health checks
  HEALTH_CHECK_TIMEOUT: z.coerce.number().default(5000),
  
  // Claude Code integration
  CLAUDE_CODE_MODEL: z.string().optional(),
  CLAUDE_CODE_SMALL_MODEL: z.string().optional()
})

type Config = z.infer<typeof ConfigSchema>

class ConfigManager {
  private _config: Config | null = null
  
  get config(): Config {
    if (!this._config) {
      this._config = this.loadConfig()
    }
    return this._config
  }
  
  private loadConfig(): Config {
    try {
      const rawConfig = {
        PORT: process.env.PORT,
        HOST: process.env.HOST,
        NODE_ENV: process.env.NODE_ENV,
        LOG_LEVEL: process.env.LOG_LEVEL,
        LOG_FORMAT: process.env.LOG_FORMAT,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        ACCOUNT_TYPE: process.env.ACCOUNT_TYPE,
        RATE_LIMIT_SECONDS: process.env.RATE_LIMIT_SECONDS,
        RATE_LIMIT_WAIT: process.env.RATE_LIMIT_WAIT,
        MANUAL_APPROVAL: process.env.MANUAL_APPROVAL,
        SHOW_TOKENS: process.env.SHOW_TOKENS,
        COPILOT_BASE_URL: process.env.COPILOT_BASE_URL,
        COPILOT_VERSION: process.env.COPILOT_VERSION,
        ENABLE_METRICS: process.env.ENABLE_METRICS,
        METRICS_PORT: process.env.METRICS_PORT,
        HEALTH_CHECK_TIMEOUT: process.env.HEALTH_CHECK_TIMEOUT,
        CLAUDE_CODE_MODEL: process.env.CLAUDE_CODE_MODEL,
        CLAUDE_CODE_SMALL_MODEL: process.env.CLAUDE_CODE_SMALL_MODEL
      }
      
      return ConfigSchema.parse(rawConfig)
    } catch (error) {
      if (error instanceof z.ZodError) {
        console.error("Configuration validation failed:")
        error.errors.forEach(err => {
          console.error(`  ${err.path.join(".")}: ${err.message}`)
        })
        process.exit(1)
      }
      throw error
    }
  }
  
  // Get configuration value with fallback
  get<K extends keyof Config>(key: K, fallback?: Config[K]): Config[K] {
    const value = this.config[key]
    return value !== undefined ? value : (fallback as Config[K])
  }
  
  // Check if running in production
  isProduction(): boolean {
    return this.config.NODE_ENV === "production"
  }
  
  // Check if running in development
  isDevelopment(): boolean {
    return this.config.NODE_ENV === "development"
  }
  
  // Check if running in test
  isTest(): boolean {
    return this.config.NODE_ENV === "test"
  }
  
  // Get server configuration
  getServerConfig() {
    return {
      port: this.config.PORT,
      host: this.config.HOST,
      nodeEnv: this.config.NODE_ENV
    }
  }
  
  // Get logging configuration
  getLoggingConfig() {
    return {
      level: this.config.LOG_LEVEL,
      format: this.config.LOG_FORMAT
    }
  }
  
  // Get rate limiting configuration
  getRateLimitConfig() {
    return {
      seconds: this.config.RATE_LIMIT_SECONDS,
      wait: this.config.RATE_LIMIT_WAIT
    }
  }
  
  // Get security configuration
  getSecurityConfig() {
    return {
      manualApproval: this.config.MANUAL_APPROVAL,
      showTokens: this.config.SHOW_TOKENS
    }
  }
  
  // Get monitoring configuration
  getMonitoringConfig() {
    return {
      enableMetrics: this.config.ENABLE_METRICS,
      metricsPort: this.config.METRICS_PORT,
      healthCheckTimeout: this.config.HEALTH_CHECK_TIMEOUT
    }
  }
  
  // Validate configuration
  validate(): { valid: boolean; errors: string[] } {
    try {
      ConfigSchema.parse(process.env)
      return { valid: true, errors: [] }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return {
          valid: false,
          errors: error.errors.map(err => `${err.path.join(".")}: ${err.message}`)
        }
      }
      return { valid: false, errors: ["Unknown validation error"] }
    }
  }
  
  // Get configuration summary for debugging
  getSummary() {
    const config = this.config
    return {
      server: {
        port: config.PORT,
        host: config.HOST,
        environment: config.NODE_ENV
      },
      logging: {
        level: config.LOG_LEVEL,
        format: config.LOG_FORMAT
      },
      github: {
        hasToken: !!config.GITHUB_TOKEN,
        accountType: config.ACCOUNT_TYPE
      },
      features: {
        rateLimiting: !!config.RATE_LIMIT_SECONDS,
        manualApproval: config.MANUAL_APPROVAL,
        showTokens: config.SHOW_TOKENS,
        metrics: config.ENABLE_METRICS
      }
    }
  }
}

// Singleton instance
export const configManager = new ConfigManager()
export const config = configManager.config

// Export type for use in other modules
export type { Config }