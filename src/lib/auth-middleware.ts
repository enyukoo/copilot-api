import type { Context, Next } from "hono";
import { tokenManager, validateApiToken } from "./api-tokens.js";
import consola from "consola";

/**
 * API Authentication Middleware
 * 
 * Handles multiple authentication methods:
 * 1. GitHub Copilot tokens (automatic)
 * 2. API keys (Bearer tokens)
 * 3. Development mode (no auth)
 */

export interface AuthContext {
  isAuthenticated: boolean;
  authMethod: 'copilot' | 'api-key' | 'development' | 'none';
  userId?: string;
  tokenInfo?: {
    expires?: Date;
    scopes?: string[];
    usage: number;
  };
}

/**
 * Extract API key from Authorization header
 */
function extractApiKey(authHeader: string): string | null {
  if (!authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7).trim();
}

/**
 * Validate GitHub Copilot token
 */
function validateCopilotToken(): boolean {
  const copilotToken = tokenManager.getCopilotToken();
  const validation = tokenManager.validateTokens();
  
  return !!(copilotToken && validation.isValid && !validation.isExpired);
}

/**
 * Create authentication context
 */
function createAuthContext(
  method: AuthContext['authMethod'],
  isAuthenticated: boolean,
  userId?: string
): AuthContext {
  const tokens = tokenManager.loadTokens();
  
  return {
    isAuthenticated,
    authMethod: method,
    userId,
    tokenInfo: tokens ? {
      expires: tokens.expires_at ? new Date(tokens.expires_at) : undefined,
      usage: tokens.usage_count
    } : undefined
  };
}

/**
 * Authentication middleware
 */
export function authMiddleware(options: {
  requireAuth?: boolean;
  allowApiKey?: boolean;
  developmentMode?: boolean;
} = {}) {
  const {
    requireAuth = false,
    allowApiKey = true,
    developmentMode = process.env.NODE_ENV === 'development'
  } = options;

  return async (c: Context, next: Next) => {
    let authContext: AuthContext;

    try {
      // Check for API key authentication first
      if (allowApiKey) {
        const authHeader = c.req.header('Authorization');
        if (authHeader) {
          const apiKey = extractApiKey(authHeader);
          if (apiKey && validateApiToken(apiKey)) {
            authContext = createAuthContext('api-key', true, 'api-user');
            c.set('auth', authContext);
            consola.debug('Request authenticated with API key');
            return await next();
          } else if (apiKey) {
            // Invalid API key provided
            consola.warn('Invalid API key provided:', apiKey.substring(0, 10) + '...');
            return c.json({ 
              error: { 
                message: 'Invalid API key',
                type: 'authentication_error' 
              } 
            }, 401);
          }
        }
      }

      // Check for Copilot token authentication
      if (validateCopilotToken()) {
        authContext = createAuthContext('copilot', true, 'copilot-user');
        c.set('auth', authContext);
        consola.debug('Request authenticated with Copilot token');
        return await next();
      }

      // Development mode - allow unauthenticated access
      if (developmentMode && !requireAuth) {
        authContext = createAuthContext('development', true, 'dev-user');
        c.set('auth', authContext);
        consola.debug('Request allowed in development mode');
        return await next();
      }

      // No authentication provided
      if (requireAuth) {
        authContext = createAuthContext('none', false);
        c.set('auth', authContext);
        
        return c.json({
          error: {
            message: 'Authentication required. Provide API key in Authorization header or ensure Copilot tokens are configured.',
            type: 'authentication_error',
            details: {
              supportedMethods: ['Bearer token', 'GitHub Copilot token'],
              documentation: '/docs/authentication'
            }
          }
        }, 401);
      }

      // Optional authentication - proceed without auth
      authContext = createAuthContext('none', false);
      c.set('auth', authContext);
      return await next();

    } catch (error) {
      consola.error('Authentication middleware error:', error);
      return c.json({
        error: {
          message: 'Authentication system error',
          type: 'server_error'
        }
      }, 500);
    }
  };
}

/**
 * Get authentication context from request
 */
export function getAuthContext(c: Context): AuthContext {
  return c.get('auth') || createAuthContext('none', false);
}

/**
 * Require authentication for route
 */
export function requireAuth() {
  return authMiddleware({ requireAuth: true });
}

/**
 * Optional authentication for route
 */
export function optionalAuth() {
  return authMiddleware({ requireAuth: false });
}

/**
 * API key only authentication
 */
export function requireApiKey() {
  return authMiddleware({ 
    requireAuth: true, 
    allowApiKey: true,
    developmentMode: false 
  });
}

/**
 * Development-only authentication (bypasses auth in dev mode)
 */
export function devAuth() {
  return authMiddleware({ 
    requireAuth: false,
    developmentMode: true 
  });
}

/**
 * Check if current request is authenticated
 */
export function isAuthenticated(c: Context): boolean {
  const auth = getAuthContext(c);
  return auth.isAuthenticated;
}

/**
 * Get current user ID from authenticated request
 */
export function getCurrentUser(c: Context): string | null {
  const auth = getAuthContext(c);
  return auth.isAuthenticated ? (auth.userId || null) : null;
}

/**
 * Admin authentication (requires specific API key or development mode)
 */
export function requireAdmin() {
  return async (c: Context, next: Next) => {
    // In development mode, allow admin access
    if (process.env.NODE_ENV === 'development') {
      return await next();
    }
    
    // Check for admin API key
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      const apiKey = extractApiKey(authHeader);
      const adminKey = process.env.ADMIN_API_KEY || tokenManager.getApiKey();
      
      if (apiKey === adminKey) {
        return await next();
      }
    }
    
    return c.json({
      error: {
        message: 'Admin access required',
        type: 'authorization_error'
      }
    }, 403);
  };
}

/**
 * Rate limiting based on authentication method
 */
export function getAuthBasedRateLimit(c: Context): {
  requestsPerMinute: number;
  burstLimit: number;
} {
  const auth = getAuthContext(c);
  
  switch (auth.authMethod) {
    case 'api-key':
      return { requestsPerMinute: 100, burstLimit: 20 };
    case 'copilot':
      return { requestsPerMinute: 60, burstLimit: 15 };
    case 'development':
      return { requestsPerMinute: 1000, burstLimit: 100 };
    default:
      return { requestsPerMinute: 10, burstLimit: 5 };
  }
}

/**
 * Log authentication events
 */
export function logAuthEvent(
  event: 'login' | 'logout' | 'token_refresh' | 'auth_failure',
  details: Record<string, any> = {}
) {
  consola.info(`Auth event: ${event}`, {
    timestamp: new Date().toISOString(),
    ...details
  });
}

/**
 * Initialize authentication system
 */
export function initializeAuth(): {
  success: boolean;
  hasTokens: boolean;
  apiKey?: string;
} {
  try {
    const validation = tokenManager.validateTokens();
    const apiKey = tokenManager.getApiKey();
    
    // Create API key if none exists
    if (!apiKey) {
      const newApiKey = tokenManager.generateApiKey();
      tokenManager.setApiKey(newApiKey);
      
      return {
        success: true,
        hasTokens: validation.isValid,
        apiKey: newApiKey
      };
    }
    
    return {
      success: true,
      hasTokens: validation.isValid,
      apiKey
    };
  } catch (error) {
    consola.error('Failed to initialize authentication system:', error);
    return {
      success: false,
      hasTokens: false
    };
  }
}