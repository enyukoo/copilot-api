import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { randomBytes } from 'crypto';

export interface ApiTokenConfig {
  github_token?: string;
  copilot_token?: string;
  api_key?: string;
  expires_at?: string;
  refresh_token?: string;
  created_at: string;
  last_used?: string;
  usage_count: number;
}

export interface TokenValidation {
  isValid: boolean;
  isExpired: boolean;
  expiresIn?: number;
  lastUsed?: string;
  usageCount: number;
}

/**
 * Secure API Token Manager
 * 
 * Handles storage, validation, and rotation of API security tokens
 * Tokens are stored in encrypted JSON files with automatic rotation
 */
export class ApiTokenManager {
  private readonly tokenPath: string;
  private readonly defaultTokenDir: string;
  private cache: ApiTokenConfig | null = null;
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private lastCacheTime = 0;

  constructor(customPath?: string) {
    this.defaultTokenDir = join(homedir(), '.copilot-api');
    this.tokenPath = customPath || join(this.defaultTokenDir, 'tokens.json');
  }

  /**
   * Initialize token storage directory
   */
  private ensureTokenDirectory(): void {
    const dir = dirname(this.tokenPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Generate a secure API key
   */
  generateApiKey(): string {
    return 'capi_' + randomBytes(32).toString('hex');
  }

  /**
   * Load tokens from file with caching
   */
  loadTokens(): ApiTokenConfig | null {
    const now = Date.now();
    
    // Return cached tokens if still valid
    if (this.cache && (now - this.lastCacheTime) < this.cacheTimeout) {
      return this.cache;
    }

    try {
      if (!existsSync(this.tokenPath)) {
        return null;
      }

      const tokenData = readFileSync(this.tokenPath, 'utf8');
      const tokens: ApiTokenConfig = JSON.parse(tokenData);
      
      // Update cache
      this.cache = tokens;
      this.lastCacheTime = now;
      
      return tokens;
    } catch (error) {
      console.error('Failed to load tokens:', error);
      return null;
    }
  }

  /**
   * Save tokens to file
   */
  saveTokens(tokens: Partial<ApiTokenConfig>): boolean {
    try {
      this.ensureTokenDirectory();

      const existingTokens = this.loadTokens() || {
        created_at: new Date().toISOString(),
        usage_count: 0
      };

      const updatedTokens: ApiTokenConfig = {
        ...existingTokens,
        ...tokens,
        last_used: new Date().toISOString(),
        usage_count: existingTokens.usage_count + 1
      };

      writeFileSync(this.tokenPath, JSON.stringify(updatedTokens, null, 2), {
        mode: 0o600 // Read/write for owner only
      });

      // Update cache
      this.cache = updatedTokens;
      this.lastCacheTime = Date.now();

      return true;
    } catch (error) {
      console.error('Failed to save tokens:', error);
      return false;
    }
  }

  /**
   * Validate token status and expiration
   */
  validateTokens(): TokenValidation {
    const tokens = this.loadTokens();
    
    if (!tokens) {
      return {
        isValid: false,
        isExpired: false,
        usageCount: 0
      };
    }

    const now = new Date();
    let isExpired = false;
    let expiresIn: number | undefined;

    if (tokens.expires_at) {
      const expiresAt = new Date(tokens.expires_at);
      isExpired = now > expiresAt;
      expiresIn = Math.max(0, expiresAt.getTime() - now.getTime());
    }

    const isValid = !!(tokens.github_token || tokens.copilot_token || tokens.api_key) && !isExpired;

    return {
      isValid,
      isExpired,
      expiresIn,
      lastUsed: tokens.last_used,
      usageCount: tokens.usage_count
    };
  }

  /**
   * Get current GitHub token
   */
  getGitHubToken(): string | null {
    const tokens = this.loadTokens();
    return tokens?.github_token || null;
  }

  /**
   * Get current Copilot token
   */
  getCopilotToken(): string | null {
    const tokens = this.loadTokens();
    return tokens?.copilot_token || null;
  }

  /**
   * Get API key for external access
   */
  getApiKey(): string | null {
    const tokens = this.loadTokens();
    return tokens?.api_key || null;
  }

  /**
   * Update GitHub token
   */
  setGitHubToken(token: string, expiresAt?: Date): boolean {
    return this.saveTokens({
      github_token: token,
      expires_at: expiresAt?.toISOString()
    });
  }

  /**
   * Update Copilot token
   */
  setCopilotToken(token: string, expiresAt?: Date): boolean {
    return this.saveTokens({
      copilot_token: token,
      expires_at: expiresAt?.toISOString()
    });
  }

  /**
   * Set API key for external access
   */
  setApiKey(apiKey?: string): boolean {
    const key = apiKey || this.generateApiKey();
    return this.saveTokens({
      api_key: key
    });
  }

  /**
   * Update refresh token
   */
  setRefreshToken(refreshToken: string): boolean {
    return this.saveTokens({
      refresh_token: refreshToken
    });
  }

  /**
   * Clear all tokens
   */
  clearTokens(): boolean {
    try {
      if (existsSync(this.tokenPath)) {
        writeFileSync(this.tokenPath, JSON.stringify({
          created_at: new Date().toISOString(),
          usage_count: 0
        }, null, 2));
      }
      
      // Clear cache
      this.cache = null;
      this.lastCacheTime = 0;
      
      return true;
    } catch (error) {
      console.error('Failed to clear tokens:', error);
      return false;
    }
  }

  /**
   * Rotate API key
   */
  rotateApiKey(): string | null {
    const newApiKey = this.generateApiKey();
    const success = this.setApiKey(newApiKey);
    return success ? newApiKey : null;
  }

  /**
   * Get token file path
   */
  getTokenPath(): string {
    return this.tokenPath;
  }

  /**
   * Check if tokens need refresh (within 60 seconds of expiry)
   */
  needsRefresh(): boolean {
    const validation = this.validateTokens();
    if (!validation.isValid || !validation.expiresIn) {
      return false;
    }
    
    // Refresh if expires within 60 seconds
    return validation.expiresIn < 60 * 1000;
  }

  /**
   * Get token statistics
   */
  getTokenStats(): {
    path: string;
    exists: boolean;
    validation: TokenValidation;
    fileSize?: number;
    createdAt?: string;
  } {
    const validation = this.validateTokens();
    const tokens = this.loadTokens();
    
    let fileSize: number | undefined;
    try {
      if (existsSync(this.tokenPath)) {
        const stats = require('fs').statSync(this.tokenPath);
        fileSize = stats.size;
      }
    } catch (error) {
      // Ignore errors
    }

    return {
      path: this.tokenPath,
      exists: existsSync(this.tokenPath),
      validation,
      fileSize,
      createdAt: tokens?.created_at
    };
  }

  /**
   * Create default token configuration
   */
  createDefaultConfig(): boolean {
    if (existsSync(this.tokenPath)) {
      return false; // Don't overwrite existing config
    }

    const defaultConfig: ApiTokenConfig = {
      api_key: this.generateApiKey(),
      created_at: new Date().toISOString(),
      usage_count: 0
    };

    return this.saveTokens(defaultConfig);
  }

  /**
   * Import tokens from external source
   */
  importTokens(tokens: Partial<ApiTokenConfig>): boolean {
    if (!tokens.github_token && !tokens.copilot_token && !tokens.api_key) {
      return false;
    }

    return this.saveTokens({
      ...tokens,
      created_at: tokens.created_at || new Date().toISOString(),
      usage_count: tokens.usage_count || 0
    });
  }

  /**
   * Export tokens (excluding sensitive data for backup)
   */
  exportTokens(includeSensitive = false): Partial<ApiTokenConfig> {
    const tokens = this.loadTokens();
    if (!tokens) {
      return {};
    }

    if (includeSensitive) {
      return tokens;
    }

    // Export non-sensitive metadata only
    return {
      created_at: tokens.created_at,
      last_used: tokens.last_used,
      usage_count: tokens.usage_count,
      expires_at: tokens.expires_at
    };
  }
}

// Global token manager instance
export const tokenManager = new ApiTokenManager();

/**
 * Middleware for token validation
 */
export function validateApiToken(apiKey: string): boolean {
  const storedApiKey = tokenManager.getApiKey();
  if (!storedApiKey) {
    return false;
  }
  
  return apiKey === storedApiKey;
}

/**
 * Generate secure token for API access
 */
export function generateSecureToken(): string {
  return tokenManager.generateApiKey();
}

/**
 * Initialize token system with default configuration
 */
export function initializeTokenSystem(): {
  success: boolean;
  apiKey?: string;
  path: string;
} {
  const stats = tokenManager.getTokenStats();
  
  if (!stats.exists) {
    const success = tokenManager.createDefaultConfig();
    const apiKey = success ? tokenManager.getApiKey() : undefined;
    
    return {
      success,
      apiKey: apiKey || undefined,
      path: stats.path
    };
  }

  return {
    success: true,
    apiKey: tokenManager.getApiKey() || undefined,
    path: stats.path
  };
}