#!/usr/bin/env node

import { Command } from 'commander';
import { tokenManager, initializeTokenSystem } from '../lib/api-tokens.js';
import { existsSync } from 'fs';

const program = new Command();

program
  .name('copilot-api-tokens')
  .description('Copilot API Token Management CLI')
  .version('1.0.0');

/**
 * Initialize token system
 */
program
  .command('init')
  .description('Initialize token system with default configuration')
  .option('--force', 'Force re-initialization even if tokens exist')
  .action(async (options) => {
    try {
      const stats = tokenManager.getTokenStats();
      
      if (stats.exists && !options.force) {
        console.log('✅ Token system already initialized');
        console.log(`📁 Token file: ${stats.path}`);
        console.log(`🔑 API Key: ${tokenManager.getApiKey()?.substring(0, 20)}...`);
        return;
      }

      if (options.force && stats.exists) {
        console.log('🔄 Force re-initializing token system...');
        tokenManager.clearTokens();
      }

      const result = initializeTokenSystem();
      
      if (result.success) {
        console.log('✅ Token system initialized successfully');
        console.log(`📁 Token file: ${result.path}`);
        console.log(`🔑 API Key: ${result.apiKey}`);
        console.log('');
        console.log('💡 Use this API key for external API access:');
        console.log(`   Authorization: Bearer ${result.apiKey}`);
      } else {
        console.error('❌ Failed to initialize token system');
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error initializing tokens:', error);
      process.exit(1);
    }
  });

/**
 * Show token status
 */
program
  .command('status')
  .description('Show current token status and validation')
  .option('--json', 'Output as JSON')
  .action(async (options) => {
    try {
      const stats = tokenManager.getTokenStats();
      const validation = tokenManager.validateTokens();
      const tokens = tokenManager.loadTokens();

      if (options.json) {
        console.log(JSON.stringify({
          ...stats,
          tokens: tokens ? {
            hasGitHubToken: !!tokens.github_token,
            hasCopilotToken: !!tokens.copilot_token,
            hasApiKey: !!tokens.api_key,
            createdAt: tokens.created_at,
            lastUsed: tokens.last_used,
            usageCount: tokens.usage_count
          } : null
        }, null, 2));
        return;
      }

      console.log('🔐 Copilot API Token Status');
      console.log('================================');
      console.log(`📁 Token file: ${stats.path}`);
      console.log(`📄 File exists: ${stats.exists ? '✅' : '❌'}`);
      
      if (stats.fileSize) {
        console.log(`📊 File size: ${stats.fileSize} bytes`);
      }

      if (validation.isValid) {
        console.log('✅ Tokens are valid');
      } else {
        console.log('❌ Tokens are invalid or missing');
      }

      if (validation.isExpired) {
        console.log('⚠️  Tokens have expired');
      }

      if (validation.expiresIn) {
        const hours = Math.floor(validation.expiresIn / (1000 * 60 * 60));
        const minutes = Math.floor((validation.expiresIn % (1000 * 60 * 60)) / (1000 * 60));
        console.log(`⏰ Expires in: ${hours}h ${minutes}m`);
      }

      if (tokens) {
        console.log('');
        console.log('📋 Token Details:');
        console.log(`   GitHub Token: ${tokens.github_token ? '✅ Present' : '❌ Missing'}`);
        console.log(`   Copilot Token: ${tokens.copilot_token ? '✅ Present' : '❌ Missing'}`);
        console.log(`   API Key: ${tokens.api_key ? '✅ Present' : '❌ Missing'}`);
        console.log(`   Created: ${tokens.created_at ? new Date(tokens.created_at).toLocaleString() : 'Unknown'}`);
        console.log(`   Last Used: ${tokens.last_used ? new Date(tokens.last_used).toLocaleString() : 'Never'}`);
        console.log(`   Usage Count: ${tokens.usage_count}`);

        if (tokens.api_key) {
          console.log('');
          console.log('🔑 API Key for external access:');
          console.log(`   ${tokens.api_key}`);
          console.log('');
          console.log('💡 Usage example:');
          console.log('   curl -H "Authorization: Bearer ' + tokens.api_key + '" http://localhost:4141/v1/models');
        }
      }

    } catch (error) {
      console.error('❌ Error checking token status:', error);
      process.exit(1);
    }
  });

/**
 * Generate new API key
 */
program
  .command('generate-key')
  .description('Generate a new API key')
  .option('--rotate', 'Rotate existing API key')
  .action(async (options) => {
    try {
      let apiKey: string | null;

      if (options.rotate) {
        console.log('🔄 Rotating API key...');
        apiKey = tokenManager.rotateApiKey();
      } else {
        apiKey = tokenManager.generateApiKey();
        const success = tokenManager.setApiKey(apiKey);
        if (!success) {
          apiKey = null;
        }
      }

      if (apiKey) {
        console.log('✅ New API key generated:');
        console.log(`🔑 ${apiKey}`);
        console.log('');
        console.log('💡 Usage example:');
        console.log(`   curl -H "Authorization: Bearer ${apiKey}" http://localhost:4141/v1/models`);
      } else {
        console.error('❌ Failed to generate API key');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error generating API key:', error);
      process.exit(1);
    }
  });

/**
 * Set tokens manually
 */
program
  .command('set')
  .description('Set tokens manually')
  .option('--github-token <token>', 'Set GitHub token')
  .option('--copilot-token <token>', 'Set Copilot token')
  .option('--api-key <key>', 'Set API key')
  .option('--expires <date>', 'Set expiration date (ISO format)')
  .action(async (options) => {
    try {
      let updated = false;
      const expiresAt = options.expires ? new Date(options.expires) : undefined;

      if (options.githubToken) {
        const success = tokenManager.setGitHubToken(options.githubToken, expiresAt);
        if (success) {
          console.log('✅ GitHub token updated');
          updated = true;
        } else {
          console.error('❌ Failed to update GitHub token');
        }
      }

      if (options.copilotToken) {
        const success = tokenManager.setCopilotToken(options.copilotToken, expiresAt);
        if (success) {
          console.log('✅ Copilot token updated');
          updated = true;
        } else {
          console.error('❌ Failed to update Copilot token');
        }
      }

      if (options.apiKey) {
        const success = tokenManager.setApiKey(options.apiKey);
        if (success) {
          console.log('✅ API key updated');
          updated = true;
        } else {
          console.error('❌ Failed to update API key');
        }
      }

      if (!updated) {
        console.log('❌ No tokens were updated. Use --help for usage information.');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error setting tokens:', error);
      process.exit(1);
    }
  });

/**
 * Clear tokens
 */
program
  .command('clear')
  .description('Clear all tokens')
  .option('--force', 'Skip confirmation prompt')
  .action(async (options) => {
    try {
      if (!options.force) {
        // Simple confirmation without external dependencies
        console.log('⚠️  This will clear all stored tokens.');
        console.log('❓ Continue? (y/N)');
        
        process.stdin.setEncoding('utf8');
        process.stdin.resume();
        
        const answer = await new Promise<string>((resolve) => {
          process.stdin.once('data', (data) => {
            resolve(data.toString().trim());
          });
        });

        if (answer.toLowerCase() !== 'y' && answer.toLowerCase() !== 'yes') {
          console.log('❌ Operation cancelled');
          return;
        }
      }

      const success = tokenManager.clearTokens();
      
      if (success) {
        console.log('✅ All tokens cleared successfully');
      } else {
        console.error('❌ Failed to clear tokens');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error clearing tokens:', error);
      process.exit(1);
    } finally {
      process.stdin.pause();
    }
  });

/**
 * Import tokens from file
 */
program
  .command('import <file>')
  .description('Import tokens from JSON file')
  .option('--merge', 'Merge with existing tokens instead of replacing')
  .action(async (file, options) => {
    try {
      if (!existsSync(file)) {
        console.error(`❌ File not found: ${file}`);
        process.exit(1);
      }

      const { readFileSync } = await import('fs');
      const tokenData = JSON.parse(readFileSync(file, 'utf8'));

      if (!options.merge) {
        tokenManager.clearTokens();
      }

      const success = tokenManager.importTokens(tokenData);
      
      if (success) {
        console.log('✅ Tokens imported successfully');
        
        // Show status after import
        const validation = tokenManager.validateTokens();
        console.log(`🔐 Valid: ${validation.isValid ? '✅' : '❌'}`);
        console.log(`⏰ Expired: ${validation.isExpired ? '⚠️' : '✅'}`);
      } else {
        console.error('❌ Failed to import tokens');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error importing tokens:', error);
      process.exit(1);
    }
  });

/**
 * Export tokens to file
 */
program
  .command('export <file>')
  .description('Export tokens to JSON file')
  .option('--include-sensitive', 'Include sensitive token data (use with caution)')
  .action(async (file, options) => {
    try {
      const tokens = tokenManager.exportTokens(options.includeSensitive);
      
      if (Object.keys(tokens).length === 0) {
        console.error('❌ No tokens to export');
        process.exit(1);
      }

      const { writeFileSync } = await import('fs');
      writeFileSync(file, JSON.stringify(tokens, null, 2));

      console.log(`✅ Tokens exported to: ${file}`);
      
      if (options.includeSensitive) {
        console.log('⚠️  Exported file contains sensitive data - handle with care');
      } else {
        console.log('ℹ️  Exported metadata only (no sensitive tokens)');
      }

    } catch (error) {
      console.error('❌ Error exporting tokens:', error);
      process.exit(1);
    }
  });

/**
 * Validate API key
 */
program
  .command('validate <apiKey>')
  .description('Validate an API key against stored tokens')
  .action(async (apiKey) => {
    try {
      const { validateApiToken } = await import('../lib/api-tokens.js');
      const isValid = validateApiToken(apiKey);
      
      if (isValid) {
        console.log('✅ API key is valid');
        
        // Update usage count
        const tokens = tokenManager.loadTokens();
        if (tokens) {
          tokenManager.saveTokens(tokens);
        }
      } else {
        console.log('❌ API key is invalid');
        process.exit(1);
      }

    } catch (error) {
      console.error('❌ Error validating API key:', error);
      process.exit(1);
    }
  });

/**
 * Watch for token changes
 */
program
  .command('watch')
  .description('Watch for token file changes')
  .action(async () => {
    try {
      const { watchFile } = await import('fs');
      const tokenPath = tokenManager.getTokenPath();
      
      console.log(`👀 Watching token file: ${tokenPath}`);
      console.log('Press Ctrl+C to stop watching...');
      
      watchFile(tokenPath, () => {
        console.log(`\n🔄 Token file changed at ${new Date().toLocaleString()}`);
        
        const validation = tokenManager.validateTokens();
        console.log(`✅ Valid: ${validation.isValid ? 'Yes' : 'No'}`);
        console.log(`⏰ Expired: ${validation.isExpired ? 'Yes' : 'No'}`);
        
        if (validation.expiresIn) {
          const minutes = Math.floor(validation.expiresIn / (1000 * 60));
          console.log(`⏰ Expires in: ${minutes} minutes`);
        }
      });
      
      // Keep process alive
      process.stdin.resume();

    } catch (error) {
      console.error('❌ Error watching tokens:', error);
      process.exit(1);
    }
  });

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled rejection:', reason);
  process.exit(1);
});

// Parse command line arguments
program.parse();

export default program;