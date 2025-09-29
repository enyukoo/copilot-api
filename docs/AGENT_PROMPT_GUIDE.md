# Agent Prompt Usage Examples

The Copilot API now supports an `agent_prompt` field that allows you to inject system-level instructions alongside regular chat messages. This is useful for defining agent behavior, setting context, or providing guidelines.

## How it Works

The `agent_prompt` field gets processed as follows:
1. If no system message exists, it creates a new system message at the beginning
2. If a system message already exists, it prepends the agent prompt to the existing system message
3. The agent prompt is removed from the payload sent to the underlying API

## Basic Usage

### Simple Agent Prompt
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "agent_prompt": "You are a helpful coding assistant. Always provide code examples and explain complex concepts clearly.",
    "messages": [
      {"role": "user", "content": "How do I create a REST API in Node.js?"}
    ]
  }' \
  http://localhost:4141/v1/chat/completions
```

### Agent Prompt with Existing System Message
```bash
curl -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "gpt-4",
    "agent_prompt": "Follow security best practices and mention potential vulnerabilities.",
    "messages": [
      {"role": "system", "content": "You are an expert web developer."},
      {"role": "user", "content": "Show me how to handle user authentication."}
    ]
  }' \
  http://localhost:4141/v1/chat/completions
```

## Use Cases

### 1. Code Review Agent
```json
{
  "model": "gpt-4",
  "agent_prompt": "You are a senior code reviewer. Focus on security, performance, and best practices. Provide specific suggestions for improvement.",
  "messages": [
    {"role": "user", "content": "Review this function: function login(user, pass) { return user === 'admin' && pass === '123'; }"}
  ]
}
```

### 2. Documentation Agent
```json
{
  "model": "gpt-4", 
  "agent_prompt": "You are a technical writer. Create clear, comprehensive documentation with examples and troubleshooting tips.",
  "messages": [
    {"role": "user", "content": "Document how to use the performance monitoring API"}
  ]
}
```

### 3. Debugging Assistant
```json
{
  "model": "gpt-4",
  "agent_prompt": "You are a debugging expert. Ask clarifying questions and provide step-by-step troubleshooting approaches.",
  "messages": [
    {"role": "user", "content": "My API returns 500 errors randomly"}
  ]
}
```

### 4. Language-Specific Expert
```json
{
  "model": "gpt-4",
  "agent_prompt": "You are a Python expert specializing in data science and machine learning. Prefer pandas, numpy, and scikit-learn solutions.",
  "messages": [
    {"role": "user", "content": "How do I analyze time series data?"}
  ]
}
```

## Advanced Examples

### Multi-turn Conversation with Agent Context
```json
{
  "model": "gpt-4",
  "agent_prompt": "You are a patient tutor. Break down complex topics into simple steps and check understanding before moving on.",
  "messages": [
    {"role": "user", "content": "I want to learn about machine learning"},
    {"role": "assistant", "content": "Great! Let's start with the basics. Machine learning is..."},
    {"role": "user", "content": "What's the difference between supervised and unsupervised learning?"}
  ]
}
```

### Combining Agent Prompt with Tools
```json
{
  "model": "gpt-4",
  "agent_prompt": "You have access to code execution tools. Always test code examples before providing them to users.",
  "messages": [
    {"role": "user", "content": "Write a function to calculate Fibonacci numbers"}
  ],
  "tools": [
    {
      "type": "function",
      "function": {
        "name": "execute_code",
        "description": "Execute Python code"
      }
    }
  ]
}
```

## JavaScript/Node.js Example

```javascript
const response = await fetch('http://localhost:4141/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_API_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    agent_prompt: 'You are a helpful assistant that explains things simply and provides practical examples.',
    messages: [
      { role: 'user', content: 'Explain async/await in JavaScript' }
    ]
  })
});

const completion = await response.json();
console.log(completion.choices[0].message.content);
```

## Python Example

```python
import requests

response = requests.post('http://localhost:4141/v1/chat/completions', 
  headers={'Authorization': 'Bearer YOUR_API_KEY'},
  json={
    'model': 'gpt-4',
    'agent_prompt': 'You are a Python expert. Provide clean, well-commented code with error handling.',
    'messages': [
      {'role': 'user', 'content': 'Create a function to read a CSV file safely'}
    ]
  }
)

completion = response.json()
print(completion['choices'][0]['message']['content'])
```

## Performance Considerations

- Agent prompts are processed on every request, so keep them concise
- Use the `/performance/recommendations` endpoint to choose the fastest model for your use case
- Consider caching agent prompts in your application rather than sending the same prompt repeatedly

## Best Practices

1. **Be Specific**: Clear, specific agent prompts yield better results
2. **Set Boundaries**: Define what the agent should and shouldn't do
3. **Provide Context**: Include relevant domain knowledge or constraints
4. **Test Iterations**: Experiment with different agent prompts to find what works best
5. **Combine Thoughtfully**: When using with existing system messages, ensure they complement each other

## Troubleshooting

- If the agent doesn't follow the prompt, try making it more specific or moving critical instructions to the beginning
- Long agent prompts may count against token limits - monitor usage with `/performance` endpoints
- Check `/docs/auth/status` if you encounter authentication issues