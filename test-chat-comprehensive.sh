#!/bin/bash

echo "🔍 COMPREHENSIVE CHAT INTERFACE TEST"
echo "=================================="

# Test 1: Health check
echo "1. Testing health endpoint..."
HEALTH=$(curl -s http://192.168.1.3/health | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "healthy" ]; then
    echo "✅ Health check passed"
else
    echo "❌ Health check failed: $HEALTH"
    exit 1
fi

# Test 2: Models endpoint
echo -e "\n2. Testing models endpoint..."
MODELS=$(curl -s http://192.168.1.3/v1/models | jq '.data | length' 2>/dev/null)
if [ "$MODELS" -gt 0 ]; then
    echo "✅ Models endpoint working: $MODELS models available"
else
    echo "❌ Models endpoint failed"
    exit 1
fi

# Test 3: Test various chat completion scenarios
echo -e "\n3. Testing chat completions endpoint..."

# Test 3a: Simple valid request
echo "   3a. Simple valid request..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.3/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50,
    "temperature": 0.7,
    "stream": false
  }')

if [ "$RESULT" = "200" ]; then
    echo "   ✅ Simple request works (200)"
else
    echo "   ❌ Simple request failed ($RESULT)"
fi

# Test 3b: Empty messages array (should fail)
echo "   3b. Empty messages array (expected to fail)..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.3/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4.1",
    "messages": [],
    "max_tokens": 50
  }')

if [ "$RESULT" = "400" ]; then
    echo "   ✅ Empty messages correctly rejected (400)"
else
    echo "   ❌ Empty messages should fail with 400, got $RESULT"
fi

# Test 3c: Missing model (should fail)
echo "   3c. Missing model (expected to fail)..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.3/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }')

if [ "$RESULT" = "400" ]; then
    echo "   ✅ Missing model correctly rejected (400)"
else
    echo "   ❌ Missing model should fail with 400, got $RESULT"
fi

# Test 3d: Invalid JSON (should fail)
echo "   3d. Invalid JSON (expected to fail)..."
RESULT=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://192.168.1.3/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4.1","messages":[{"role":"user","content":"Hello"}')

if [ "$RESULT" = "400" ]; then
    echo "   ✅ Invalid JSON correctly rejected (400)"
else
    echo "   ❌ Invalid JSON should fail with 400, got $RESULT"
fi

# Test 4: Frontend-like request simulation
echo -e "\n4. Testing frontend-like request..."
RESULT=$(curl -s -X POST http://192.168.1.3/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Origin: http://192.168.1.3" \
  -H "Referer: http://192.168.1.3/chat/" \
  -d '{
    "model": "gpt-4.1",
    "messages": [{"role": "user", "content": "are you gpt-4.1"}],
    "max_tokens": 4000,
    "temperature": 0.7,
    "stream": false
  }' | jq '.choices[0].message.content' 2>/dev/null)

if [ ! -z "$RESULT" ] && [ "$RESULT" != "null" ]; then
    echo "✅ Frontend-like request works"
    echo "   Response: $(echo $RESULT | cut -c1-50)..."
else
    echo "❌ Frontend-like request failed"
fi

# Test 5: Check chat interface loads
echo -e "\n5. Testing chat interface loading..."
CHAT_TITLE=$(curl -s http://192.168.1.3/chat/ | grep -o '<title>.*</title>' | sed 's/<[^>]*>//g')
if [ "$CHAT_TITLE" = "Copilot AI Chat" ]; then
    echo "✅ Chat interface loads correctly"
else
    echo "❌ Chat interface loading issue: '$CHAT_TITLE'"
fi

echo -e "\n🏁 Test completed! Check server logs: tail -20 server.log"