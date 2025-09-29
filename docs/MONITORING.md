# Monitoring and Alerting Configuration

This document provides comprehensive monitoring and alerting setup for the copilot-api project.

## Prometheus Configuration

### Prometheus Scrape Configuration

```yaml
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

rule_files:
  - "copilot-api-alerts.yml"

scrape_configs:
  - job_name: 'copilot-api'
    static_configs:
      - targets: ['copilot-api:3000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s
    honor_labels: true
    
  - job_name: 'copilot-api-health'
    static_configs:
      - targets: ['copilot-api:3000']
    metrics_path: '/health/detailed'
    scrape_interval: 30s
    scrape_timeout: 10s
    metric_relabel_configs:
      - source_labels: [__name__]
        regex: 'up'
        target_label: 'service'
        replacement: 'copilot-api'

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093
```

### Alert Rules Configuration

```yaml
# copilot-api-alerts.yml
groups:
  - name: copilot-api-alerts
    rules:
      # High Error Rate
      - alert: CopilotAPIHighErrorRate
        expr: rate(http_requests_total{job="copilot-api", status=~"5.."}[5m]) / rate(http_requests_total{job="copilot-api"}[5m]) > 0.05
        for: 2m
        labels:
          severity: critical
          service: copilot-api
        annotations:
          summary: "Copilot API high error rate detected"
          description: "Error rate is {{ $value | humanizePercentage }} for the last 5 minutes"
          
      # High Response Time
      - alert: CopilotAPIHighResponseTime
        expr: histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="copilot-api"}[5m])) > 2
        for: 5m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API high response time"
          description: "95th percentile response time is {{ $value }}s"
          
      # High Memory Usage
      - alert: CopilotAPIHighMemoryUsage
        expr: process_resident_memory_bytes{job="copilot-api"} / (1024 * 1024 * 1024) > 1.5
        for: 10m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API high memory usage"
          description: "Memory usage is {{ $value | humanize }}GB"
          
      # Service Down
      - alert: CopilotAPIDown
        expr: up{job="copilot-api"} == 0
        for: 1m
        labels:
          severity: critical
          service: copilot-api
        annotations:
          summary: "Copilot API service is down"
          description: "Copilot API has been down for more than 1 minute"
          
      # High Rate Limit Usage
      - alert: CopilotAPIHighRateLimitUsage
        expr: rate(rate_limit_exceeded_total{job="copilot-api"}[5m]) > 10
        for: 5m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API high rate limit usage"
          description: "Rate limit exceeded {{ $value }} times per second"
          
      # Authentication Failures
      - alert: CopilotAPIAuthFailures
        expr: rate(http_requests_total{job="copilot-api", status="401"}[5m]) > 5
        for: 2m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API authentication failures"
          description: "Authentication failure rate is {{ $value }} per second"
          
      # Health Check Failures
      - alert: CopilotAPIHealthCheckFailed
        expr: http_requests_total{job="copilot-api", endpoint="/health", status!="200"} > 0
        for: 1m
        labels:
          severity: critical
          service: copilot-api
        annotations:
          summary: "Copilot API health check failing"
          description: "Health check endpoint returning non-200 status"

  - name: copilot-api-business-alerts
    rules:
      # Token Expiration Warning
      - alert: CopilotAPITokenExpiringSoon
        expr: (github_token_expires_at - time()) / 3600 < 24
        for: 0m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API token expiring soon"
          description: "GitHub token expires in {{ $value | humanizeDuration }}"
          
      # Quota Usage Warning
      - alert: CopilotAPIQuotaHigh
        expr: github_copilot_quota_used / github_copilot_quota_total > 0.8
        for: 5m
        labels:
          severity: warning
          service: copilot-api
        annotations:
          summary: "Copilot API quota usage high"
          description: "Quota usage is {{ $value | humanizePercentage }}"
```

## Grafana Dashboard Configuration

### Dashboard JSON Configuration

```json
{
  "dashboard": {
    "id": null,
    "title": "Copilot API Monitoring",
    "tags": ["copilot-api", "monitoring"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "Request Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"copilot-api\"}[5m])",
            "legendFormat": "Requests/sec"
          }
        ],
        "fieldConfig": {
          "defaults": {
            "unit": "reqps"
          }
        }
      },
      {
        "id": 2,
        "title": "Response Time",
        "type": "timeseries",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, rate(http_request_duration_seconds_bucket{job=\"copilot-api\"}[5m]))",
            "legendFormat": "50th percentile"
          },
          {
            "expr": "histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job=\"copilot-api\"}[5m]))",
            "legendFormat": "95th percentile"
          },
          {
            "expr": "histogram_quantile(0.99, rate(http_request_duration_seconds_bucket{job=\"copilot-api\"}[5m]))",
            "legendFormat": "99th percentile"
          }
        ]
      },
      {
        "id": 3,
        "title": "Error Rate",
        "type": "timeseries",
        "targets": [
          {
            "expr": "rate(http_requests_total{job=\"copilot-api\", status=~\"4..\"}[5m])",
            "legendFormat": "4xx errors"
          },
          {
            "expr": "rate(http_requests_total{job=\"copilot-api\", status=~\"5..\"}[5m])",
            "legendFormat": "5xx errors"
          }
        ]
      },
      {
        "id": 4,
        "title": "Memory Usage",
        "type": "timeseries",
        "targets": [
          {
            "expr": "process_resident_memory_bytes{job=\"copilot-api\"} / (1024 * 1024)",
            "legendFormat": "Memory (MB)"
          }
        ]
      },
      {
        "id": 5,
        "title": "Active Connections",
        "type": "stat",
        "targets": [
          {
            "expr": "nodejs_active_handles{job=\"copilot-api\"}",
            "legendFormat": "Active Handles"
          }
        ]
      },
      {
        "id": 6,
        "title": "Request by Endpoint",
        "type": "table",
        "targets": [
          {
            "expr": "sum(rate(http_requests_total{job=\"copilot-api\"}[5m])) by (endpoint)",
            "format": "table"
          }
        ]
      }
    ],
    "time": {
      "from": "now-1h",
      "to": "now"
    },
    "refresh": "10s"
  }
}
```

## Docker Compose Monitoring Stack

```yaml
# docker-compose.monitoring.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/copilot-api-alerts.yml:/etc/prometheus/copilot-api-alerts.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/usr/share/prometheus/console_libraries'
      - '--web.console.templates=/usr/share/prometheus/consoles'
      - '--web.enable-lifecycle'
      - '--web.enable-admin-api'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin123
      - GF_USERS_ALLOW_SIGN_UP=false
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - "9093:9093"
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - "9100:9100"
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.ignored-mount-points=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  monitoring:
    driver: bridge
```

## Alertmanager Configuration

```yaml
# alertmanager.yml
global:
  smtp_smarthost: 'smtp.example.com:587'
  smtp_from: 'alerts@example.com'
  smtp_auth_username: 'alerts@example.com'
  smtp_auth_password: 'your-password'

route:
  group_by: ['alertname', 'service']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 1h
  receiver: 'web.hook'
  routes:
    - match:
        severity: critical
      receiver: 'critical-alerts'
    - match:
        severity: warning
      receiver: 'warning-alerts'

receivers:
  - name: 'web.hook'
    webhook_configs:
      - url: 'http://127.0.0.1:5001/'

  - name: 'critical-alerts'
    email_configs:
      - to: 'ops-team@example.com'
        subject: 'CRITICAL: {{ .GroupLabels.service }} Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#alerts'
        title: 'CRITICAL Alert'
        text: '{{ range .Alerts }}{{ .Annotations.summary }}{{ end }}'

  - name: 'warning-alerts'
    email_configs:
      - to: 'dev-team@example.com'
        subject: 'WARNING: {{ .GroupLabels.service }} Alert'
        body: |
          {{ range .Alerts }}
          Alert: {{ .Annotations.summary }}
          Description: {{ .Annotations.description }}
          {{ end }}

inhibit_rules:
  - source_match:
      severity: 'critical'
    target_match:
      severity: 'warning'
    equal: ['alertname', 'service']
```

## Kubernetes Monitoring Configuration

### ServiceMonitor for Prometheus Operator

```yaml
# servicemonitor.yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: copilot-api-metrics
  namespace: production
  labels:
    app: copilot-api
    release: prometheus
spec:
  selector:
    matchLabels:
      app: copilot-api
  endpoints:
  - port: http
    path: /metrics
    interval: 30s
    scrapeTimeout: 10s
  - port: http
    path: /health/detailed
    interval: 60s
    scrapeTimeout: 15s
```

### PrometheusRule for Kubernetes

```yaml
# prometheus-rules.yaml
apiVersion: monitoring.coreos.com/v1
kind: PrometheusRule
metadata:
  name: copilot-api-rules
  namespace: production
  labels:
    app: copilot-api
    release: prometheus
spec:
  groups:
  - name: copilot-api.rules
    rules:
    - alert: CopilotAPIPodCrashLooping
      expr: rate(kube_pod_container_status_restarts_total{namespace="production", pod=~"copilot-api-.*"}[15m]) > 0
      for: 5m
      labels:
        severity: critical
        service: copilot-api
      annotations:
        summary: "Copilot API pod is crash looping"
        description: "Pod {{ $labels.pod }} is restarting frequently"
        
    - alert: CopilotAPIDeploymentReplicasMismatch
      expr: kube_deployment_spec_replicas{namespace="production", deployment="copilot-api"} != kube_deployment_status_ready_replicas{namespace="production", deployment="copilot-api"}
      for: 15m
      labels:
        severity: warning
        service: copilot-api
      annotations:
        summary: "Copilot API deployment replicas mismatch"
        description: "Deployment replicas do not match ready replicas"
```

## Log Aggregation Configuration

### Fluentd Configuration

```yaml
# fluentd-copilot-api.conf
<source>
  @type tail
  path /var/log/containers/copilot-api-*.log
  pos_file /var/log/fluentd-copilot-api.log.pos
  tag kubernetes.copilot-api
  format json
  time_format %Y-%m-%dT%H:%M:%S.%NZ
</source>

<filter kubernetes.copilot-api>
  @type kubernetes_metadata
  kubernetes_url https://kubernetes.default.svc.cluster.local
  verify_ssl false
</filter>

<filter kubernetes.copilot-api>
  @type parser
  key_name log
  format json
  reserve_data true
</filter>

<match kubernetes.copilot-api>
  @type elasticsearch
  host elasticsearch.logging.svc.cluster.local
  port 9200
  index_name copilot-api
  type_name logs
  include_timestamp true
  reload_connections false
  reconnect_on_error true
  reload_on_failure true
</match>
```

### Elasticsearch Index Template

```json
{
  "index_patterns": ["copilot-api-*"],
  "template": {
    "settings": {
      "number_of_shards": 1,
      "number_of_replicas": 1,
      "index.refresh_interval": "30s"
    },
    "mappings": {
      "properties": {
        "@timestamp": {
          "type": "date"
        },
        "level": {
          "type": "keyword"
        },
        "message": {
          "type": "text"
        },
        "requestId": {
          "type": "keyword"
        },
        "path": {
          "type": "keyword"
        },
        "method": {
          "type": "keyword"
        },
        "statusCode": {
          "type": "integer"
        },
        "responseTime": {
          "type": "float"
        },
        "error": {
          "type": "object",
          "properties": {
            "name": {
              "type": "keyword"
            },
            "message": {
              "type": "text"
            },
            "stack": {
              "type": "text"
            }
          }
        }
      }
    }
  }
}
```

## Health Check Monitoring

### External Health Check Script

```bash
#!/bin/bash
# health-check.sh

set -e

API_URL="${API_URL:-http://localhost:3000}"
TIMEOUT="${TIMEOUT:-10}"
EXPECTED_STATUS="${EXPECTED_STATUS:-200}"

echo "Checking Copilot API health at $API_URL"

# Basic health check
RESPONSE=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/health" -o /tmp/health_response.json)
HTTP_CODE="${RESPONSE: -3}"

if [ "$HTTP_CODE" != "$EXPECTED_STATUS" ]; then
    echo "ERROR: Health check failed with HTTP $HTTP_CODE"
    cat /tmp/health_response.json
    exit 1
fi

# Detailed health check
DETAILED_RESPONSE=$(curl -s -w "%{http_code}" -m $TIMEOUT "$API_URL/health/detailed" -o /tmp/detailed_health.json)
DETAILED_HTTP_CODE="${DETAILED_RESPONSE: -3}"

if [ "$DETAILED_HTTP_CODE" != "$EXPECTED_STATUS" ]; then
    echo "WARNING: Detailed health check failed with HTTP $DETAILED_HTTP_CODE"
    cat /tmp/detailed_health.json
fi

# Parse and validate health response
HEALTH_STATUS=$(jq -r '.status' /tmp/health_response.json)
if [ "$HEALTH_STATUS" != "healthy" ]; then
    echo "ERROR: Service status is $HEALTH_STATUS"
    exit 1
fi

# Check memory usage
MEMORY_MB=$(jq -r '.services.memory.usage.heapUsed' /tmp/detailed_health.json | awk '{print $1/1024/1024}')
if (( $(echo "$MEMORY_MB > 1000" | bc -l) )); then
    echo "WARNING: High memory usage: ${MEMORY_MB}MB"
fi

echo "✅ Copilot API is healthy"
rm -f /tmp/health_response.json /tmp/detailed_health.json
```

## Monitoring Deployment Commands

```bash
# Deploy monitoring stack
kubectl apply -f k8s/monitoring/

# Port forward to access Grafana locally
kubectl port-forward -n monitoring svc/grafana 3001:3000

# Port forward to access Prometheus locally
kubectl port-forward -n monitoring svc/prometheus 9090:9090

# Check ServiceMonitor status
kubectl get servicemonitor -n production

# View Prometheus targets
kubectl port-forward -n monitoring svc/prometheus 9090:9090 &
curl http://localhost:9090/api/v1/targets

# Test alerts
kubectl run test-pod --image=curlimages/curl --rm -it -- curl -X POST http://copilot-api.production.svc.cluster.local/v1/chat/completions
```

This comprehensive monitoring setup provides:

1. **Metrics Collection**: Prometheus scraping with custom metrics
2. **Alerting**: Critical and warning alerts for various scenarios
3. **Visualization**: Grafana dashboards for monitoring
4. **Log Aggregation**: Structured logging with Elasticsearch
5. **Health Monitoring**: Automated health check scripts
6. **Kubernetes Integration**: ServiceMonitor and PrometheusRule resources