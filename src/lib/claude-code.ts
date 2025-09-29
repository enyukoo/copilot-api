import { type Context } from "hono"
import consola from "consola"
import { execSync } from "node:child_process"
import { writeFileSync, readFileSync, existsSync } from "node:fs"
import { homedir } from "node:os"
import { join } from "node:path"

interface ClaudeCodeConfig {
  endpoint: string
  models: string[]
  selectedModel: string
  environment: Record<string, string>
}

interface ModelInfo {
  id: string
  name: string
  description: string
  provider: string
  capabilities: string[]
}

// Claude Code integration utilities
export class ClaudeCodeIntegration {
  private configPath: string
  private config: ClaudeCodeConfig

  constructor() {
    this.configPath = join(homedir(), '.copilot-api', 'claude-code-config.json')
    this.config = this.loadConfig()
  }

  private loadConfig(): ClaudeCodeConfig {
    const defaultConfig: ClaudeCodeConfig = {
      endpoint: 'http://localhost:4141',
      models: [],
      selectedModel: 'claude-3.5-sonnet',
      environment: {}
    }

    try {
      if (existsSync(this.configPath)) {
        const configData = readFileSync(this.configPath, 'utf-8')
        return { ...defaultConfig, ...JSON.parse(configData) }
      }
    } catch (error) {
      consola.warn('Failed to load Claude Code config:', error)
    }

    return defaultConfig
  }

  private saveConfig() {
    try {
      writeFileSync(this.configPath, JSON.stringify(this.config, null, 2))
    } catch (error) {
      consola.error('Failed to save Claude Code config:', error)
    }
  }

  setupEnvironment(models: ModelInfo[]) {
    // Set up environment variables for Claude Code
    const envVars = {
      'ANTHROPIC_API_KEY': 'not_needed_with_copilot_api',
      'ANTHROPIC_BASE_URL': this.config.endpoint + '/v1',
      'COPILOT_API_ENDPOINT': this.config.endpoint,
      'COPILOT_API_MODELS': models.map(m => m.id).join(','),
      'CLAUDE_MODEL': this.config.selectedModel
    }

    this.config.environment = envVars
    this.config.models = models.map(m => m.id)
    this.saveConfig()

    return envVars
  }

  generateShellScript(models: ModelInfo[]): string {
    const envVars = this.setupEnvironment(models)
    
    const script = `#!/bin/bash
# Copilot API Claude Code Integration Setup
# Generated on ${new Date().toISOString()}

echo "🤖 Setting up Claude Code integration with Copilot API..."

# Export environment variables
${Object.entries(envVars).map(([key, value]) => `export ${key}="${value}"`).join('\n')}

# Verify the setup
echo "📋 Configuration:"
echo "  Endpoint: $COPILOT_API_ENDPOINT"
echo "  Base URL: $ANTHROPIC_BASE_URL"
echo "  Selected Model: $CLAUDE_MODEL"
echo "  Available Models: $(echo $COPILOT_API_MODELS | tr ',' ' ')"

# Test the connection
echo "🔌 Testing connection..."
if curl -s "$COPILOT_API_ENDPOINT/health" > /dev/null; then
    echo "✅ Connection successful!"
else
    echo "❌ Connection failed. Make sure the Copilot API server is running."
    exit 1
fi

# Optional: Install claude-dev extension if not present
if command -v code &> /dev/null; then
    echo "🔧 Checking for Claude Dev extension..."
    if ! code --list-extensions | grep -q "saoudrizwan.claude-dev"; then
        echo "📦 Installing Claude Dev extension..."
        code --install-extension saoudrizwan.claude-dev
    else
        echo "✅ Claude Dev extension already installed"
    fi
fi

echo "🎉 Setup complete! You can now use Claude Code with the Copilot API."
echo "💡 Tip: Run 'claude-code select-model' to change the active model."
`

    return script
  }

  selectModel(modelId: string): boolean {
    if (!this.config.models.includes(modelId)) {
      return false
    }

    this.config.selectedModel = modelId
    this.config.environment.CLAUDE_MODEL = modelId
    this.saveConfig()

    return true
  }

  getCurrentConfig(): ClaudeCodeConfig {
    return { ...this.config }
  }

  getModelOptions(): string[] {
    return this.config.models
  }

  copyToClipboard(text: string): boolean {
    try {
      // Try different clipboard commands based on platform
      const commands = [
        'pbcopy',           // macOS
        'xclip -selection clipboard',  // Linux
        'clip'              // Windows
      ]

      for (const cmd of commands) {
        try {
          execSync(`echo "${text.replace(/"/g, '\\"')}" | ${cmd}`, { stdio: 'pipe' })
          return true
        } catch {
          continue
        }
      }

      return false
    } catch (error) {
      consola.error('Failed to copy to clipboard:', error)
      return false
    }
  }

  generateClaudeCodeCommand(type: 'setup' | 'run' | 'config'): string {
    switch (type) {
      case 'setup':
        return `# Claude Code Setup Command
export ANTHROPIC_BASE_URL="${this.config.endpoint}/v1"
export CLAUDE_MODEL="${this.config.selectedModel}"
claude-dev --setup`

      case 'run':
        return `# Run Claude Code with Copilot API
export ANTHROPIC_BASE_URL="${this.config.endpoint}/v1"
export CLAUDE_MODEL="${this.config.selectedModel}"
claude-dev`

      case 'config':
        return `# Configure Claude Code
export ANTHROPIC_BASE_URL="${this.config.endpoint}/v1"
export CLAUDE_MODEL="${this.config.selectedModel}"
export COPILOT_API_ENDPOINT="${this.config.endpoint}"
claude-dev --config`

      default:
        return '# Unknown command type'
    }
  }
}

// API endpoints for Claude Code integration
export async function setupEnvironment(c: Context) {
  try {
    const integration = new ClaudeCodeIntegration()
    
    // Get models from the API
    const modelsResponse = await fetch(`${c.req.url.split('/').slice(0, 3).join('/')}/v1/models`)
    const modelsData = await modelsResponse.json()
    
    const models: ModelInfo[] = ((modelsData as any)?.data || []).map((model: any) => ({
      id: model.id,
      name: model.id,
      description: `${model.id} model`,
      provider: model.id.startsWith('claude') ? 'Anthropic' : 'OpenAI',
      capabilities: ['chat', 'completion']
    }))

    const envVars = integration.setupEnvironment(models)
    
    return c.json({
      success: true,
      environment: envVars,
      models: models.map(m => m.id),
      selectedModel: integration.getCurrentConfig().selectedModel
    })
  } catch (error) {
    consola.error('Error setting up environment:', error)
    return c.json({ error: 'Failed to setup environment' }, 500)
  }
}

export async function selectModel(c: Context) {
  try {
    const { model } = await c.req.json()
    const integration = new ClaudeCodeIntegration()
    
    if (!model || typeof model !== 'string') {
      return c.json({ error: 'Model ID is required' }, 400)
    }

    const success = integration.selectModel(model)
    
    if (!success) {
      return c.json({ error: 'Invalid model ID' }, 400)
    }

    return c.json({
      success: true,
      selectedModel: model,
      environment: integration.getCurrentConfig().environment
    })
  } catch (error) {
    consola.error('Error selecting model:', error)
    return c.json({ error: 'Failed to select model' }, 500)
  }
}

export async function generateScript(c: Context) {
  try {
    const integration = new ClaudeCodeIntegration()
    
    // Get models from the API
    const modelsResponse = await fetch(`${c.req.url.split('/').slice(0, 3).join('/')}/v1/models`)
    const modelsData = await modelsResponse.json()
    
    const models: ModelInfo[] = ((modelsData as any)?.data || []).map((model: any) => ({
      id: model.id,
      name: model.id,
      description: `${model.id} model`,
      provider: model.id.startsWith('claude') ? 'Anthropic' : 'OpenAI',
      capabilities: ['chat', 'completion']
    }))

    const script = integration.generateShellScript(models)
    const copyQuery = c.req.query('copy')
    
    if (copyQuery === 'true') {
      const copied = integration.copyToClipboard(script)
      return c.json({
        success: true,
        script,
        copied,
        message: copied ? 'Script copied to clipboard' : 'Script generated (clipboard not available)'
      })
    }

    return c.text(script, 200, {
      'Content-Type': 'application/x-sh',
      'Content-Disposition': 'attachment; filename="claude-code-setup.sh"'
    })
  } catch (error) {
    consola.error('Error generating script:', error)
    return c.json({ error: 'Failed to generate script' }, 500)
  }
}

export async function getClaudeCodeCommand(c: Context) {
  try {
    const type = c.req.query('type') as 'setup' | 'run' | 'config' || 'run'
    const integration = new ClaudeCodeIntegration()
    
    const command = integration.generateClaudeCodeCommand(type)
    const copyQuery = c.req.query('copy')
    
    if (copyQuery === 'true') {
      const copied = integration.copyToClipboard(command)
      return c.json({
        success: true,
        command,
        copied,
        message: copied ? 'Command copied to clipboard' : 'Command generated (clipboard not available)'
      })
    }

    return c.json({
      success: true,
      command,
      type
    })
  } catch (error) {
    consola.error('Error generating Claude Code command:', error)
    return c.json({ error: 'Failed to generate command' }, 500)
  }
}

export async function getConfig(c: Context) {
  try {
    const integration = new ClaudeCodeIntegration()
    const config = integration.getCurrentConfig()
    
    return c.json({
      success: true,
      config,
      models: integration.getModelOptions()
    })
  } catch (error) {
    consola.error('Error getting config:', error)
    return c.json({ error: 'Failed to get config' }, 500)
  }
}