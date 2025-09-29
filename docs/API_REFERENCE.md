# Copilot API Developer Reference

## Table of Contents

1. [Authentication](#authentication)
2. [Base URLs](#base-urls)
3. [Rate Limiting](#rate-limiting)
4. [Error Handling](#error-handling)
5. [Chat Completions API](#chat-completions-api)
6. [Models API](#models-api)
7. [Embeddings API](#embeddings-api)
8. [Anthropic-Compatible API](#anthropic-compatible-api)
9. [Usage & Monitoring](#usage--monitoring)
10. [WebSocket Support](#websocket-support)
11. [SDKs & Examples](#sdks--examples)

---

## Authentication

### API Token Setup

The Copilot API uses GitHub Copilot tokens for authentication. Tokens are automatically managed and stored securely.

#### Token File Location
```bash
# Default token storage location
~/.copilot-api/tokens.json
```

#### Initial Authentication
```bash
# Authenticate with GitHub
copilot-api auth

# Force re-authentication
copilot-api auth --force

# Display token status
copilot-api auth --show-token
```

#### Manual Token Configuration
If you need to set up tokens manually, create a `tokens.json` file:

```json
{
  "github_token": "ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "copilot_token": "ghu_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
  "expires_at": "2025-09-29T12:00:00.000Z",
  "refresh_token": "ghr_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

### Using Tokens in API Requests

The API automatically handles token management. No additional headers are required for standard requests.

For direct API access, tokens are managed internally by the server.

---

## Base URLs

### Production Endpoints
```
Base URL: http://your-server:4141
Web Interface: http://your-server/chat/
Dashboard: http://your-server/dashboard/
```

### Local Development
```
Base URL: http://localhost:4141
Web Interface: http://localhost/chat/
Dashboard: http://localhost/dashboard/
```

---

## Rate Limiting

### Default Limits
- **Requests per second**: Configurable (default: 1 request/second)
- **Concurrent requests**: 10
- **Token refresh**: Automatic (60 seconds before expiration)

### Rate Limit Headers
```http
X-RateLimit-Remaining: 59
X-RateLimit-Reset: 1695984000
X-RateLimit-Limit: 60
```

### Configure Rate Limiting
```bash
# Start server with custom rate limits
copilot-api start --rate-limit-seconds 2 --rate-limit-wait

# Disable rate limiting (development only)
copilot-api start --rate-limit-seconds 0
```

---

## Error Handling

### Standard Error Response
```json
{
  "error": {
    "message": "Error description",
    "type": "error_type",
    "code": "ERROR_CODE",
    "request_id": "req_1234567890"
  }
}
```

### Common Error Types

| Status Code | Error Type | Description |
|-------------|------------|-------------|
| 400 | `client_error` | Invalid request format |
| 401 | `authentication_error` | Invalid or missing token |
| 429 | `rate_limit_error` | Rate limit exceeded |
| 500 | `server_error` | Internal server error |
| 503 | `service_unavailable` | Service temporarily unavailable |

---

## Chat Completions API

### OpenAI-Compatible Endpoint

#### Request
```http
POST /v1/chat/completions
Content-Type: application/json
```

```json
{
  "model": "gpt-4.1",
  "messages": [
    {
      "role": "system",
      "content": "You are a helpful assistant."
    },
    {
      "role": "user", 
      "content": "Hello, how are you?"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7,
  "top_p": 1.0,
  "stream": false,
  "presence_penalty": 0,
  "frequency_penalty": 0
}
```

#### Response
```json
{
  "id": "chatcmpl-123",
  "object": "chat.completion",
  "created": 1695984000,
  "model": "gpt-4.1-2025-04-14",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm doing well, thank you for asking. How can I help you today?"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 19,
    "completion_tokens": 20,
    "total_tokens": 39
  }
}
```

### Streaming Response
```http
POST /v1/chat/completions
Content-Type: application/json
```

```json
{
  "model": "gpt-4.1",
  "messages": [{"role": "user", "content": "Hello"}],
  "stream": true
}
```

#### Streaming Events
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1695984000,"model":"gpt-4.1","choices":[{"index":0,"delta":{"role":"assistant","content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1695984000,"model":"gpt-4.1","choices":[{"index":0,"delta":{"content":"!"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1695984000,"model":"gpt-4.1","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Supported Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `model` | string | required | Model ID to use |
| `messages` | array | required | Array of message objects |
| `max_tokens` | integer | 4096 | Maximum tokens to generate |
| `temperature` | number | 0.7 | Sampling temperature (0-2) |
| `top_p` | number | 1.0 | Nucleus sampling parameter |
| `stream` | boolean | false | Enable streaming response |
| `presence_penalty` | number | 0 | Presence penalty (-2 to 2) |
| `frequency_penalty` | number | 0 | Frequency penalty (-2 to 2) |

---

## Models API

### List Available Models

#### Request
```http
GET /v1/models
```

#### Response
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4.1",
      "object": "model",
      "created": 1695984000,
      "owned_by": "openai",
      "capabilities": {
        "type": "chat",
        "max_context_tokens": 128000,
        "max_output_tokens": 16384
      }
    },
    {
      "id": "claude-3.5-sonnet",
      "object": "model", 
      "created": 1695984000,
      "owned_by": "anthropic",
      "capabilities": {
        "type": "chat",
        "max_context_tokens": 200000,
        "max_output_tokens": 8192
      }
    }
  ]
}
```

### Available Models

| Model ID | Provider | Context Length | Max Output |
|----------|----------|----------------|------------|
| `gpt-4.1` | OpenAI | 128K tokens | 16K tokens |
| `gpt-4o` | OpenAI | 128K tokens | 16K tokens |
| `gpt-3.5-turbo` | OpenAI | 16K tokens | 4K tokens |
| `claude-3.5-sonnet` | Anthropic | 200K tokens | 8K tokens |
| `claude-3.7-sonnet` | Anthropic | 200K tokens | 8K tokens |
| `gemini-2.0-flash-001` | Google | 128K tokens | 8K tokens |
| `o3-mini` | OpenAI | 128K tokens | 16K tokens |

---

## Embeddings API

### Create Embeddings

#### Request
```http
POST /v1/embeddings
Content-Type: application/json
```

```json
{
  "model": "text-embedding-3-small",
  "input": [
    "The quick brown fox jumps over the lazy dog",
    "Hello, world!"
  ],
  "encoding_format": "float"
}
```

#### Response
```json
{
  "object": "list",
  "data": [
    {
      "object": "embedding",
      "embedding": [0.123, -0.456, 0.789, ...],
      "index": 0
    },
    {
      "object": "embedding", 
      "embedding": [0.321, -0.654, 0.987, ...],
      "index": 1
    }
  ],
  "model": "text-embedding-3-small",
  "usage": {
    "prompt_tokens": 12,
    "total_tokens": 12
  }
}
```

---

## Anthropic-Compatible API

### Messages API

#### Request
```http
POST /v1/messages
Content-Type: application/json
X-API-Key: your-api-key
```

```json
{
  "model": "claude-3.5-sonnet",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ]
}
```

#### Response
```json
{
  "id": "msg_123",
  "type": "message",
  "role": "assistant", 
  "content": [
    {
      "type": "text",
      "text": "Hello! How can I help you today?"
    }
  ],
  "model": "claude-3.5-sonnet",
  "stop_reason": "end_turn",
  "stop_sequence": null,
  "usage": {
    "input_tokens": 10,
    "output_tokens": 12
  }
}
```

### Token Counting
```http
POST /v1/messages/count_tokens
Content-Type: application/json
```

```json
{
  "model": "claude-3.5-sonnet",
  "messages": [
    {"role": "user", "content": "Hello"}
  ]
}
```

---

## Usage & Monitoring

### Usage Information

#### Request
```http
GET /usage
```

#### Response
```json
{
  "copilot_plan": "individual",
  "quota_snapshots": {
    "chat": {
      "unlimited": true,
      "remaining": 0,
      "percent_remaining": 100
    },
    "completions": {
      "unlimited": true, 
      "remaining": 0,
      "percent_remaining": 100
    },
    "premium_interactions": {
      "entitlement": 300,
      "remaining": 163,
      "percent_remaining": 54.33,
      "unlimited": false
    }
  },
  "quota_reset_date": "2025-10-01"
}
```

### Analytics

#### Request
```http
GET /analytics
```

#### Response
```json
{
  "requests": {
    "total": 150,
    "success": 147,
    "errors": 3,
    "hourly": [...]
  },
  "models": {
    "gpt-4.1": {
      "requests": 89,
      "successRate": 98.9,
      "avgResponseTime": 1250
    }
  },
  "performance": {
    "avgResponseTime": 1180,
    "uptime": 86400,
    "errorRate": 2.0
  }
}
```

### Health Check

#### Request
```http
GET /health
```

#### Response
```json
{
  "status": "healthy",
  "timestamp": "2025-09-29T12:00:00.000Z",
  "version": "0.5.14",
  "uptime": 86400,
  "services": {
    "github_auth": "connected",
    "copilot_api": "connected", 
    "models": "available"
  },
  "memory": {
    "used": 256,
    "total": 1024,
    "percentage": 25
  }
}
```

---

## WebSocket Support

### Real-time Updates

Connect to WebSocket for real-time updates:

```javascript
const ws = new WebSocket('ws://localhost:4141/ws');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Real-time update:', data);
};

// Subscribe to usage updates
ws.send(JSON.stringify({
  type: 'subscribe',
  topics: ['usage', 'analytics']
}));
```

---

## SDKs & Examples

### JavaScript/Node.js

```javascript
// Using fetch API
async function chatCompletion() {
  const response = await fetch('http://localhost:4141/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4.1',
      messages: [
        { role: 'user', content: 'Hello!' }
      ],
      max_tokens: 150
    })
  });
  
  const data = await response.json();
  return data.choices[0].message.content;
}

// Using OpenAI SDK (compatible)
import OpenAI from 'openai';

const openai = new OpenAI({
  baseURL: 'http://localhost:4141/v1',
  apiKey: 'not-required' // Token managed by server
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4.1',
  messages: [{ role: 'user', content: 'Hello!' }]
});
```

### Python

```python
import requests
import openai

# Direct API call
def chat_completion():
    response = requests.post(
        'http://localhost:4141/v1/chat/completions',
        json={
            'model': 'gpt-4.1',
            'messages': [{'role': 'user', 'content': 'Hello!'}],
            'max_tokens': 150
        }
    )
    return response.json()['choices'][0]['message']['content']

# Using OpenAI SDK
openai.api_base = 'http://localhost:4141/v1'
openai.api_key = 'not-required'

response = openai.ChatCompletion.create(
    model='gpt-4.1',
    messages=[{'role': 'user', 'content': 'Hello!'}]
)
```

### cURL Examples

```bash
# Basic chat completion
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1",
    "messages": [{"role": "user", "content": "Hello!"}],
    "max_tokens": 150
  }'

# Streaming response
curl -X POST http://localhost:4141/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1", 
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'

# Get usage information
curl http://localhost:4141/usage

# List models
curl http://localhost:4141/v1/models
```

---

## Environment Variables

### Server Configuration

```bash
# Server settings
PORT=4141
HOST=0.0.0.0

# Rate limiting
RATE_LIMIT_SECONDS=1
RATE_LIMIT_WAIT=true

# Token management
TOKEN_REFRESH_MARGIN=60
AUTO_REFRESH_TOKENS=true

# Logging
LOG_LEVEL=info
VERBOSE_LOGGING=false

# Development
NODE_ENV=production
DEBUG=false
```

### Custom Token Path

```bash
# Set custom token file location
export COPILOT_API_TOKEN_PATH="/custom/path/tokens.json"

# Start server with custom token path
copilot-api start --token-path "/custom/path/tokens.json"
```

---

## Deployment Guide

### Docker Deployment

```dockerfile
FROM node:18-alpine

WORKDIR /app
COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 4141

CMD ["node", "dist/main.js", "start", "--port", "4141"]
```

```bash
# Build and run
docker build -t copilot-api .
docker run -p 4141:4141 -v ~/.copilot-api:/root/.copilot-api copilot-api
```

### Nginx Reverse Proxy

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location /api/ {
        proxy_pass http://localhost:4141/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /chat/ {
        proxy_pass http://localhost:4141/;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## Troubleshooting

### Common Issues

1. **Authentication Failed**
   ```bash
   # Re-authenticate
   copilot-api auth --force
   ```

2. **Rate Limit Exceeded**
   ```bash
   # Increase rate limit
   copilot-api start --rate-limit-seconds 2
   ```

3. **Token Expired**
   ```bash
   # Check token status
   copilot-api debug
   ```

4. **Models Not Available**
   ```bash
   # Check service health
   curl http://localhost:4141/health
   ```

### Debug Mode

```bash
# Start in verbose mode
copilot-api start --verbose

# Enable debug logging
DEBUG=copilot-api:* copilot-api start

# Check system information
copilot-api debug --json
```

---

## Support & Resources

- **GitHub Repository**: https://github.com/enyukoo/copilot-api
- **Issues**: https://github.com/enyukoo/copilot-api/issues
- **Documentation**: https://github.com/enyukoo/copilot-api/docs
- **License**: MIT

---

*Last updated: September 29, 2025*
*API Version: 0.5.14*