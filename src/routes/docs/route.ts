import { Hono } from "hono";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { tokenManager } from "../../lib/api-tokens.js";
import { getAuthContext, requireAdmin } from "../../lib/auth-middleware.js";

const docsRoute = new Hono();

// API Documentation endpoint
docsRoute.get("/", async (c) => {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = dirname(__filename);
    const docsPath = join(__dirname, "..", "..", "docs", "API_REFERENCE.md");
    const docsContent = await readFile(docsPath, "utf-8");
    
    // Convert Markdown to HTML for better viewing
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Copilot API Documentation</title>
    <meta charset="utf-8">
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        pre {
            background: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            border-left: 4px solid #007acc;
        }
        code {
            background: #f5f5f5;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Monaco', 'Consolas', monospace;
        }
        h1, h2, h3 { color: #333; }
        h1 { border-bottom: 2px solid #007acc; padding-bottom: 10px; }
        h2 { margin-top: 30px; }
        .auth-status {
            background: #e8f4f8;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
            border-left: 4px solid #007acc;
        }
        .endpoint {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 5px;
            padding: 15px;
            margin: 10px 0;
        }
        .method {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 3px;
            font-weight: bold;
            font-size: 12px;
            margin-right: 10px;
        }
        .get { background: #28a745; color: white; }
        .post { background: #007bff; color: white; }
        .nav {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border: 1px solid #dee2e6;
        }
        .nav a {
            margin-right: 15px;
            color: #007acc;
            text-decoration: none;
        }
        .nav a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="nav">
        <strong>Quick Links:</strong>
        <a href="#authentication">Authentication</a>
        <a href="#endpoints">Endpoints</a>
        <a href="#examples">Examples</a>
        <a href="/auth/status">Auth Status</a>
        <a href="/auth/key">Get API Key</a>
    </div>
    
    <div class="auth-status">
        <h3>🔑 Authentication Status</h3>
        <p><strong>Server:</strong> ${c.req.url.split('/')[0] + '//' + c.req.url.split('/')[2]}</p>
        <p><strong>Current Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Environment:</strong> ${process.env.NODE_ENV || 'production'}</p>
        <p><a href="/auth/status">Check detailed authentication status →</a></p>
    </div>

    <div id="docs-content">
        ${docsContent.replace(/\n/g, '<br>').replace(/```([^`]+)```/g, '<pre><code>$1</code></pre>')}
    </div>

    <script>
        // Auto-convert markdown-style formatting
        const content = document.getElementById('docs-content');
        let html = content.innerHTML;
        
        // Convert headers
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        
        // Convert code blocks
        html = html.replace(/\`\`\`([^<]+)<br>/g, '<pre><code>$1</code></pre>');
        
        // Convert inline code
        html = html.replace(/\`([^<\`]+)\`/g, '<code>$1</code>');
        
        // Convert endpoints
        html = html.replace(/(GET|POST|PUT|DELETE) ([^\<]+)<br>/g, 
            '<div class="endpoint"><span class="method $1">$1</span><code>$2</code></div>');
        
        content.innerHTML = html;
    </script>
</body>
</html>`;
    
    return c.html(htmlContent);
  } catch (error) {
    return c.html(`
      <html>
        <body style="font-family: Arial; padding: 20px;">
          <h1>API Documentation</h1>
          <p><strong>Error:</strong> Could not load documentation file.</p>
          <p>Please ensure the API reference documentation exists at docs/API_REFERENCE.md</p>
          <div style="margin: 20px 0;">
            <h3>Quick Links:</h3>
            <ul>
              <li><a href="/auth/status">Authentication Status</a></li>
              <li><a href="/auth/key">Get API Key</a></li>
              <li><a href="/v1/models">Available Models</a></li>
              <li><a href="/health">Health Check</a></li>
            </ul>
          </div>
        </body>
      </html>
    `);
  }
});

// Authentication status endpoint
docsRoute.get("/auth/status", async (c) => {
  const auth = getAuthContext(c);
  const validation = tokenManager.validateTokens();
  const apiKey = tokenManager.getApiKey();
  
  return c.json({
    authentication: {
      isAuthenticated: auth.isAuthenticated,
      method: auth.authMethod,
      userId: auth.userId
    },
    tokens: {
      hasGitHubToken: validation.isValid,
      isExpired: validation.isExpired,
      usageCount: validation.usageCount
    },
    apiAccess: {
      hasApiKey: !!apiKey,
      keyPreview: apiKey ? apiKey.substring(0, 8) + '...' : null
    },
    environment: {
      nodeEnv: process.env.NODE_ENV,
      developmentMode: process.env.NODE_ENV === 'development',
      serverTime: new Date().toISOString()
    }
  });
});

// Get API key endpoint (admin only)
docsRoute.get("/auth/key", requireAdmin(), async (c) => {
  const apiKey = tokenManager.getApiKey();
  
  if (!apiKey) {
    return c.json({
      error: "No API key configured",
      message: "Run the token manager CLI to generate an API key"
    }, 404);
  }
  
  const baseUrl = c.req.url.split('/').slice(0, 3).join('/');
  
  return c.json({
    apiKey,
    usage: "Include this key in the Authorization header as 'Bearer {key}'",
    example: {
      curl: `curl -H "Authorization: Bearer ${apiKey}" ${baseUrl}/v1/models`,
      javascript: `fetch('${baseUrl}/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ${apiKey}',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Hello!' }]
  })
})`,
      python: `import requests

response = requests.post('${baseUrl}/v1/chat/completions', 
    headers={'Authorization': 'Bearer ${apiKey}'},
    json={
        'model': 'gpt-4',
        'messages': [{'role': 'user', 'content': 'Hello!'}]
    })`
    },
    security: {
      note: "Keep this key secure - it provides full API access",
      regenerate: "Use the CLI tool to regenerate if compromised"
    }
  });
});

// Generate new API key (admin only)
docsRoute.post("/auth/regenerate", requireAdmin(), async (c) => {
  try {
    const newApiKey = tokenManager.generateApiKey();
    tokenManager.setApiKey(newApiKey);
    
    return c.json({
      success: true,
      apiKey: newApiKey,
      message: "New API key generated successfully",
      warning: "Previous API key has been invalidated"
    });
  } catch (error) {
    return c.json({
      error: "Failed to generate new API key",
      details: error instanceof Error ? error.message : "Unknown error"
    }, 500);
  }
});

export { docsRoute };