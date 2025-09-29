#!/bin/bash
# Test script for copilot-api endpoints

echo "🧪 Testing Copilot API Endpoints..."
echo "=================================="

# Server base URL
SERVER_URL="http://localhost:4141"

echo "📋 1. Testing Health Check..."
curl -s "$SERVER_URL/health" | jq '.' || echo "Health check failed or server not ready"

echo ""
echo "📋 2. Testing Models Endpoint..."
curl -s "$SERVER_URL/v1/models" | jq '.data[] | {id: .id, created: .created}' || echo "Models endpoint failed"

echo ""
echo "📋 3. Testing Usage Endpoint..."
curl -s "$SERVER_URL/usage" | jq '.' || echo "Usage endpoint failed"

echo ""
echo "📋 4. Testing Chat Completions (simple request)..."
curl -s -X POST "$SERVER_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello, test message!"}],
    "max_tokens": 50
  }' | jq '.choices[0].message.content' || echo "Chat completions failed"

echo ""
echo "📋 5. Testing Anthropic Messages Endpoint..."
curl -s -X POST "$SERVER_URL/v1/messages" \
  -H "Content-Type: application/json" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": "Hello from Anthropic API!"}]
  }' | jq '.content[0].text' || echo "Anthropic messages failed"

echo ""
echo "✅ Testing complete!"