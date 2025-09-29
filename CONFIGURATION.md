# Environment Configuration

This document describes the environment variables and configuration options available for the Copilot API server.

## Environment Variables

### Server Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `PORT` | number | `4141` | Port for the server to listen on |
| `HOST` | string | `localhost` | Host address to bind to |
| `NODE_ENV` | enum | `development` | Environment mode: `development`, `production`, or `test` |

### Logging Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `LOG_LEVEL` | enum | `info` | Log level: `error`, `warn`, `info`, or `debug` |
| `LOG_FORMAT` | enum | `text` | Log format: `json` or `text` |

### GitHub Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `GITHUB_TOKEN` | string | - | GitHub personal access token (optional, can use auth flow) |
| `ACCOUNT_TYPE` | enum | `individual` | Account type: `individual`, `business`, or `enterprise` |

### Rate Limiting

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `RATE_LIMIT_SECONDS` | number | - | Minimum seconds between requests (disabled if not set) |
| `RATE_LIMIT_WAIT` | boolean | `false` | Wait instead of error when rate limit is hit |

### Security

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `MANUAL_APPROVAL` | boolean | `false` | Require manual approval for each request |
| `SHOW_TOKENS` | boolean | `false` | Show GitHub and Copilot tokens in logs (debug only) |

### API Configuration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `COPILOT_BASE_URL` | string | - | Custom Copilot API base URL (auto-detected from account type) |
| `COPILOT_VERSION` | string | `0.26.7` | Copilot API version to use |

### Monitoring

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `ENABLE_METRICS` | boolean | `false` | Enable Prometheus metrics collection |
| `METRICS_PORT` | number | `9090` | Port for metrics endpoint |
| `HEALTH_CHECK_TIMEOUT` | number | `5000` | Health check timeout in milliseconds |

### Claude Code Integration

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `CLAUDE_CODE_MODEL` | string | - | Default model for Claude Code integration |
| `CLAUDE_CODE_SMALL_MODEL` | string | - | Default small model for Claude Code |

## Configuration Examples

### Development Environment

```bash
export NODE_ENV=development
export LOG_LEVEL=debug
export PORT=4141
export SHOW_TOKENS=true
```

### Production Environment

```bash
export NODE_ENV=production
export LOG_LEVEL=info
export LOG_FORMAT=json
export PORT=8080
export RATE_LIMIT_SECONDS=1
export RATE_LIMIT_WAIT=true
export GITHUB_TOKEN=ghp_xxxxxxxxxxxx
export ACCOUNT_TYPE=business
```

### Docker Environment

```bash
docker run -d \
  -e NODE_ENV=production \
  -e PORT=4141 \
  -e LOG_LEVEL=info \
  -e GITHUB_TOKEN=$GITHUB_TOKEN \
  -e ACCOUNT_TYPE=individual \
  -p 4141:4141 \
  copilot-api:latest
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: copilot-api-config
data:
  NODE_ENV: "production"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  PORT: "4141"
  ACCOUNT_TYPE: "business"
  RATE_LIMIT_SECONDS: "2"
  RATE_LIMIT_WAIT: "true"
  ENABLE_METRICS: "true"
  HEALTH_CHECK_TIMEOUT: "10000"
```

## Configuration Validation

The application validates all environment variables on startup. If validation fails, the application will:

1. Print detailed error messages for each invalid configuration
2. Exit with code 1

You can validate your configuration without starting the server:

```bash
npm run debug
```

This will show your current configuration and validate all settings.

## Runtime Configuration Changes

Most configuration changes require a server restart. However, some settings can be modified at runtime:

- Log level can be changed via debug endpoints
- Rate limiting can be temporarily disabled via API
- Manual approval can be toggled via API

## Security Considerations

### Token Storage

- GitHub tokens are stored in `~/.local/share/copilot-api/github_token`
- File permissions are set to 0600 (owner read/write only)
- Copilot tokens are kept in memory only and refreshed automatically

### Environment Variables

- Never log `GITHUB_TOKEN` in production
- Use `SHOW_TOKENS=false` in production
- Consider using secrets management for sensitive values

### Network Security

- Bind to `127.0.0.1` instead of `0.0.0.0` if not using Docker
- Use HTTPS proxy in front of the server in production
- Consider firewall rules for port access

## Troubleshooting

### Common Issues

1. **Invalid GitHub token**
   ```bash
   export GITHUB_TOKEN=your_token_here
   npm run auth  # Re-authenticate
   ```

2. **Rate limiting too aggressive**
   ```bash
   export RATE_LIMIT_SECONDS=5
   export RATE_LIMIT_WAIT=true
   ```

3. **Logs too verbose**
   ```bash
   export LOG_LEVEL=warn
   ```

4. **Memory issues**
   ```bash
   export NODE_OPTIONS="--max-old-space-size=2048"
   ```

### Configuration Debug

Use the debug command to see current configuration:

```bash
npm run debug -- --json  # JSON format
npm run debug             # Human readable
```

### Health Check

Check if configuration is working:

```bash
curl http://localhost:4141/health/detailed
```

This returns comprehensive information about:
- Current configuration values
- Service status
- Feature flags
- System information