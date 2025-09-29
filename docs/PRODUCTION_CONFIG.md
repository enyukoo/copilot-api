# Production Environment Configuration Guide

This document provides comprehensive guidance for configuring the copilot-api project for production deployment.

## Environment Variables

### Required Environment Variables

```bash
# Server Configuration
NODE_ENV=production                    # Environment mode
PORT=3000                             # Server port
HOST=0.0.0.0                         # Server host (0.0.0.0 for containers)

# GitHub Configuration
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx       # GitHub Personal Access Token (required)

# Logging Configuration
LOG_LEVEL=info                        # Logging level (error, warn, info, debug)
LOG_FORMAT=json                       # Log format (json, text) - use json for production
```

### Optional Environment Variables

```bash
# Feature Toggles
ENABLE_METRICS=true                   # Enable performance metrics collection
ENABLE_HEALTH_CHECKS=true            # Enable health check endpoints
ENABLE_VALIDATION=true               # Enable request validation middleware
ENABLE_RATE_LIMITING=true            # Enable rate limiting
ENABLE_GRACEFUL_SHUTDOWN=true        # Enable graceful shutdown handling

# Rate Limiting Configuration
RATE_LIMIT_SECONDS=1                 # Rate limit window in seconds
RATE_LIMIT_WAIT=false                # Whether to wait or reject on rate limit

# Security Configuration
MANUAL_APPROVE=false                 # Require manual approval for requests
SHOW_TOKEN=false                     # Whether to show tokens in responses

# Monitoring Configuration
METRICS_ENDPOINT=/metrics            # Metrics endpoint path
HEALTH_ENDPOINT=/health              # Health check endpoint path

# Performance Configuration
MAX_REQUEST_SIZE=10MB                # Maximum request body size
REQUEST_TIMEOUT=30000                # Request timeout in milliseconds
KEEPALIVE_TIMEOUT=5000              # Keep-alive timeout in milliseconds
```

## Production Configuration Templates

### Docker Environment File (.env.production)

```env
# Production Environment Configuration
NODE_ENV=production
PORT=3000
HOST=0.0.0.0

# GitHub Integration
GITHUB_TOKEN=ghp_your_token_here

# Logging (JSON format for log aggregation)
LOG_LEVEL=info
LOG_FORMAT=json

# Security
MANUAL_APPROVE=false
SHOW_TOKEN=false

# Performance Features
ENABLE_METRICS=true
ENABLE_HEALTH_CHECKS=true
ENABLE_VALIDATION=true
ENABLE_RATE_LIMITING=true
ENABLE_GRACEFUL_SHUTDOWN=true

# Rate Limiting
RATE_LIMIT_SECONDS=1
RATE_LIMIT_WAIT=false

# Performance Tuning
MAX_REQUEST_SIZE=10MB
REQUEST_TIMEOUT=30000
KEEPALIVE_TIMEOUT=5000
```

### Kubernetes ConfigMap

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: copilot-api-config
  namespace: production
data:
  NODE_ENV: "production"
  PORT: "3000"
  HOST: "0.0.0.0"
  LOG_LEVEL: "info"
  LOG_FORMAT: "json"
  ENABLE_METRICS: "true"
  ENABLE_HEALTH_CHECKS: "true"
  ENABLE_VALIDATION: "true"
  ENABLE_RATE_LIMITING: "true"
  ENABLE_GRACEFUL_SHUTDOWN: "true"
  RATE_LIMIT_SECONDS: "1"
  RATE_LIMIT_WAIT: "false"
  MANUAL_APPROVE: "false"
  SHOW_TOKEN: "false"
  MAX_REQUEST_SIZE: "10MB"
  REQUEST_TIMEOUT: "30000"
  KEEPALIVE_TIMEOUT: "5000"
```

### Kubernetes Secret

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: copilot-api-secrets
  namespace: production
type: Opaque
data:
  GITHUB_TOKEN: <base64-encoded-token>
```

## Environment-Specific Settings

### Development Environment

```bash
NODE_ENV=development
LOG_LEVEL=debug
LOG_FORMAT=text
SHOW_TOKEN=true
ENABLE_METRICS=false
RATE_LIMIT_SECONDS=0.1
```

### Staging Environment

```bash
NODE_ENV=production
LOG_LEVEL=info
LOG_FORMAT=json
SHOW_TOKEN=false
ENABLE_METRICS=true
RATE_LIMIT_SECONDS=0.5
```

### Production Environment

```bash
NODE_ENV=production
LOG_LEVEL=warn
LOG_FORMAT=json
SHOW_TOKEN=false
ENABLE_METRICS=true
RATE_LIMIT_SECONDS=1
ENABLE_GRACEFUL_SHUTDOWN=true
```

## Security Considerations

### Token Management

1. **GitHub Token Security**:
   - Use GitHub Personal Access Tokens with minimal required permissions
   - Rotate tokens regularly (recommended: every 90 days)
   - Store tokens in secure secret management systems
   - Never log or expose tokens in responses (use SHOW_TOKEN=false)

2. **Environment Variable Security**:
   - Use secret management systems (Kubernetes Secrets, AWS Secrets Manager, etc.)
   - Avoid storing secrets in container images or configuration files
   - Use read-only file systems where possible

### Network Security

1. **HTTPS Configuration**:
   - Always use HTTPS in production
   - Configure proper TLS certificates
   - Use secure cipher suites

2. **Firewall and Access Control**:
   - Restrict access to management endpoints (/health, /metrics)
   - Use network policies in Kubernetes
   - Implement proper authentication and authorization

## Performance Configuration

### Memory Settings

```bash
# Node.js memory settings for production
NODE_OPTIONS="--max-old-space-size=2048 --max-new-space-size=1024"
```

### CPU and Resource Limits

```yaml
# Kubernetes resource limits
resources:
  requests:
    memory: "512Mi"
    cpu: "250m"
  limits:
    memory: "2Gi"
    cpu: "1000m"
```

### Connection Pooling

The application automatically manages connections, but consider:

- HTTP keep-alive settings
- Connection timeout configurations
- Request queue limits

## Monitoring Configuration

### Health Check Endpoints

- **Basic Health**: `GET /health`
- **Detailed Health**: `GET /health/detailed`
- **Metrics**: `GET /metrics` (Prometheus format)

### Log Aggregation

Configure log shipping to centralized logging systems:

```bash
# Example for structured logging
LOG_FORMAT=json
LOG_LEVEL=info
```

### Alerting Thresholds

Recommended alerting rules:

- Memory usage > 80%
- CPU usage > 80%
- Error rate > 5%
- Response time > 1000ms
- Health check failures

## Deployment Checklist

### Pre-Deployment

- [ ] All environment variables configured
- [ ] Secrets properly secured
- [ ] SSL certificates installed
- [ ] Network policies configured
- [ ] Resource limits set
- [ ] Monitoring configured
- [ ] Log aggregation setup

### Post-Deployment

- [ ] Health checks passing
- [ ] Metrics being collected
- [ ] Logs flowing to aggregation system
- [ ] Alerts configured and tested
- [ ] Performance baseline established
- [ ] Security scan completed

### Rollback Plan

- [ ] Previous version image available
- [ ] Database migration rollback tested
- [ ] Configuration rollback procedure
- [ ] Monitoring for rollback triggers

## Troubleshooting

### Common Issues

1. **Configuration Validation Failures**:
   - Check environment variable names and values
   - Verify Zod schema requirements
   - Review configuration summary endpoint

2. **Health Check Failures**:
   - Verify service dependencies
   - Check memory and CPU usage
   - Review application logs

3. **Performance Issues**:
   - Monitor metrics endpoint
   - Check rate limiting configuration
   - Review resource limits

### Debug Mode

For debugging production issues:

```bash
# Temporarily enable debug logging
LOG_LEVEL=debug

# Enable detailed error reporting (careful with sensitive data)
NODE_ENV=development
```

## Validation Commands

```bash
# Validate configuration
curl http://localhost:3000/health/detailed

# Check metrics
curl http://localhost:3000/metrics

# Test API functionality
curl -X POST http://localhost:3000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-token" \
  -d '{"model":"gpt-4","messages":[{"role":"user","content":"test"}]}'
```

## Support and Maintenance

### Regular Maintenance Tasks

- Weekly: Review logs and metrics
- Monthly: Security updates and dependency updates
- Quarterly: Token rotation and security audit
- Annually: Architecture review and performance optimization

### Support Contacts

- Application issues: Check GitHub repository issues
- Infrastructure issues: Contact your DevOps team
- Security issues: Follow security incident response procedures