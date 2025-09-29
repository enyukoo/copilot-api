# 🚀 Deployment Guide

This guide covers deploying the Copilot API to various environments including Docker, Kubernetes, and cloud platforms.

## 📋 Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- kubectl (for Kubernetes deployments)
- Access to container registry (GitHub Container Registry recommended)

## 🐳 Docker Deployment

### Quick Start with Docker

```bash
# Pull the latest image
docker pull ghcr.io/your-username/copilot-api:latest

# Run with basic configuration
docker run -d \
  --name copilot-api \
  -p 3000:3000 \
  -e GITHUB_CLIENT_ID=your_client_id \
  -e GITHUB_CLIENT_SECRET=your_client_secret \
  ghcr.io/your-username/copilot-api:latest
```

### Docker Compose (Recommended)

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  copilot-api:
    image: ghcr.io/your-username/copilot-api:latest
    container_name: copilot-api
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
      - GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET}
      - LOG_LEVEL=info
      - RATE_LIMIT_WINDOW_MS=900000
      - RATE_LIMIT_MAX_REQUESTS=100
      - ENABLE_CORS=true
      - CORS_ORIGIN=*
      - ENABLE_METRICS=true
      - METRICS_PATH=/metrics
      - HEALTH_CHECK_PATH=/health
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

  # Optional: Add monitoring stack
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana-storage:/var/lib/grafana
    restart: unless-stopped

volumes:
  grafana-storage:
```

Deploy with monitoring:

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f copilot-api

# Scale the API service
docker-compose up -d --scale copilot-api=3
```

## ☸️ Kubernetes Deployment

### Basic Kubernetes Manifests

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: copilot-api
  labels:
    name: copilot-api
```

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: copilot-api-config
  namespace: copilot-api
data:
  NODE_ENV: "production"
  PORT: "3000"
  LOG_LEVEL: "info"
  RATE_LIMIT_WINDOW_MS: "900000"
  RATE_LIMIT_MAX_REQUESTS: "100"
  ENABLE_CORS: "true"
  CORS_ORIGIN: "*"
  ENABLE_METRICS: "true"
  METRICS_PATH: "/metrics"
  HEALTH_CHECK_PATH: "/health"
```

Create `k8s/secret.yaml`:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: copilot-api-secrets
  namespace: copilot-api
type: Opaque
data:
  GITHUB_CLIENT_ID: <base64-encoded-client-id>
  GITHUB_CLIENT_SECRET: <base64-encoded-client-secret>
```

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: copilot-api
  namespace: copilot-api
  labels:
    app: copilot-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: copilot-api
  template:
    metadata:
      labels:
        app: copilot-api
    spec:
      containers:
      - name: copilot-api
        image: ghcr.io/your-username/copilot-api:latest
        ports:
        - containerPort: 3000
        envFrom:
        - configMapRef:
            name: copilot-api-config
        - secretRef:
            name: copilot-api-secrets
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 2
```

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: copilot-api-service
  namespace: copilot-api
  labels:
    app: copilot-api
spec:
  selector:
    app: copilot-api
  ports:
  - protocol: TCP
    port: 80
    targetPort: 3000
  type: ClusterIP
```

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: copilot-api-ingress
  namespace: copilot-api
  annotations:
    kubernetes.io/ingress.class: "nginx"
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/rate-limit-window: "1m"
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: copilot-api-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: copilot-api-service
            port:
              number: 80
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create secrets (encode your values first)
echo -n 'your-client-id' | base64
echo -n 'your-client-secret' | base64
kubectl apply -f k8s/secret.yaml

# Deploy application
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
kubectl apply -f k8s/ingress.yaml

# Check deployment status
kubectl get pods -n copilot-api
kubectl get services -n copilot-api
kubectl logs -f deployment/copilot-api -n copilot-api
```

### Horizontal Pod Autoscaler

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: copilot-api-hpa
  namespace: copilot-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: copilot-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

```bash
kubectl apply -f k8s/hpa.yaml
```

## ☁️ Cloud Platform Deployments

### AWS ECS Deployment

Create `aws/task-definition.json`:

```json
{
  "family": "copilot-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::YOUR_ACCOUNT:role/ecsTaskRole",
  "containerDefinitions": [
    {
      "name": "copilot-api",
      "image": "ghcr.io/your-username/copilot-api:latest",
      "portMappings": [
        {
          "containerPort": 3000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "NODE_ENV",
          "value": "production"
        },
        {
          "name": "PORT",
          "value": "3000"
        }
      ],
      "secrets": [
        {
          "name": "GITHUB_CLIENT_ID",
          "valueFrom": "arn:aws:ssm:region:account:parameter/copilot-api/github-client-id"
        },
        {
          "name": "GITHUB_CLIENT_SECRET",
          "valueFrom": "arn:aws:ssm:region:account:parameter/copilot-api/github-client-secret"
        }
      ],
      "healthCheck": {
        "command": [
          "CMD-SHELL",
          "curl -f http://localhost:3000/health || exit 1"
        ],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      },
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/copilot-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

Deploy to ECS:

```bash
# Create task definition
aws ecs register-task-definition --cli-input-json file://aws/task-definition.json

# Create service
aws ecs create-service \
  --cluster copilot-api-cluster \
  --service-name copilot-api \
  --task-definition copilot-api:1 \
  --desired-count 2 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-12345,subnet-67890],securityGroups=[sg-abcdef],assignPublicIp=ENABLED}"
```

### Google Cloud Run Deployment

```bash
# Build and push to Google Container Registry
gcloud builds submit --tag gcr.io/PROJECT_ID/copilot-api

# Deploy to Cloud Run
gcloud run deploy copilot-api \
  --image gcr.io/PROJECT_ID/copilot-api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 3000 \
  --memory 1Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 10 \
  --set-env-vars NODE_ENV=production,PORT=3000 \
  --set-secrets GITHUB_CLIENT_ID=copilot-api-client-id:latest,GITHUB_CLIENT_SECRET=copilot-api-client-secret:latest
```

### Azure Container Instances

```bash
# Create resource group
az group create --name copilot-api-rg --location eastus

# Create container instance
az container create \
  --resource-group copilot-api-rg \
  --name copilot-api \
  --image ghcr.io/your-username/copilot-api:latest \
  --dns-name-label copilot-api-unique \
  --ports 3000 \
  --environment-variables NODE_ENV=production PORT=3000 \
  --secure-environment-variables GITHUB_CLIENT_ID=your-client-id GITHUB_CLIENT_SECRET=your-client-secret \
  --cpu 1 \
  --memory 2
```

## 🔧 Environment Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | Application environment |
| `PORT` | No | `3000` | Server port |
| `GITHUB_CLIENT_ID` | Yes | - | GitHub OAuth app client ID |
| `GITHUB_CLIENT_SECRET` | Yes | - | GitHub OAuth app client secret |
| `LOG_LEVEL` | No | `info` | Logging level |
| `RATE_LIMIT_WINDOW_MS` | No | `900000` | Rate limit window in ms |
| `RATE_LIMIT_MAX_REQUESTS` | No | `100` | Max requests per window |
| `ENABLE_CORS` | No | `true` | Enable CORS middleware |
| `CORS_ORIGIN` | No | `*` | CORS allowed origins |
| `ENABLE_METRICS` | No | `true` | Enable Prometheus metrics |
| `METRICS_PATH` | No | `/metrics` | Metrics endpoint path |
| `HEALTH_CHECK_PATH` | No | `/health` | Health check endpoint path |

### Secrets Management

#### Kubernetes Secrets

```bash
# Create secrets
kubectl create secret generic copilot-api-secrets \
  --from-literal=GITHUB_CLIENT_ID=your-client-id \
  --from-literal=GITHUB_CLIENT_SECRET=your-client-secret \
  -n copilot-api
```

#### Docker Secrets

```bash
# Create secrets
echo "your-client-id" | docker secret create github_client_id -
echo "your-client-secret" | docker secret create github_client_secret -
```

## 📊 Monitoring Setup

### Prometheus Configuration

The API exposes metrics at `/metrics` endpoint. Configure Prometheus to scrape:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'copilot-api'
    static_configs:
      - targets: ['copilot-api:3000']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

### Health Checks

The API provides a comprehensive health check at `/health`:

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "uptime": 3600,
  "version": "1.0.0",
  "memory": {
    "used": "45.2 MB",
    "total": "512 MB",
    "percentage": 8.8
  },
  "dependencies": {
    "github_api": "healthy"
  }
}
```

## 🔒 Security Considerations

### HTTPS/TLS

Always use HTTPS in production:

```yaml
# Ingress with TLS
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    secretName: copilot-api-tls
```

### Security Headers

The API includes security headers by default:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`

### Network Security

- Use private networks when possible
- Implement proper firewall rules
- Restrict access to metrics and health endpoints if needed

## 🚦 Load Balancing

### Nginx Configuration

```nginx
upstream copilot-api {
    least_conn;
    server copilot-api-1:3000;
    server copilot-api-2:3000;
    server copilot-api-3:3000;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://copilot-api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Health check
        proxy_connect_timeout 5s;
        proxy_send_timeout 10s;
        proxy_read_timeout 10s;
    }
    
    location /health {
        proxy_pass http://copilot-api;
        access_log off;
    }
}
```

## 📝 Deployment Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Secrets properly stored
- [ ] GitHub OAuth app configured
- [ ] SSL/TLS certificates ready
- [ ] Monitoring stack deployed
- [ ] Load balancer configured

### Post-Deployment

- [ ] Health check endpoints responding
- [ ] Metrics being collected
- [ ] Logs being aggregated
- [ ] API endpoints working correctly
- [ ] Authentication flow tested
- [ ] Load testing completed
- [ ] Security scan performed

## 🔧 Troubleshooting

### Common Issues

1. **Authentication failures**
   - Verify GitHub OAuth app configuration
   - Check client ID and secret
   - Ensure correct redirect URLs

2. **High memory usage**
   - Monitor metrics at `/metrics`
   - Check for memory leaks
   - Adjust container memory limits

3. **Rate limiting issues**
   - Review rate limit configuration
   - Monitor request patterns
   - Adjust limits as needed

### Logs Analysis

```bash
# Docker
docker logs copilot-api

# Kubernetes
kubectl logs -f deployment/copilot-api -n copilot-api

# Follow specific container
kubectl logs -f pod/copilot-api-xyz -c copilot-api -n copilot-api
```

## 🔄 Updates and Rollbacks

### Rolling Updates

```bash
# Kubernetes
kubectl set image deployment/copilot-api copilot-api=ghcr.io/your-username/copilot-api:v1.2.0 -n copilot-api

# Docker Compose
docker-compose pull
docker-compose up -d
```

### Rollbacks

```bash
# Kubernetes
kubectl rollout undo deployment/copilot-api -n copilot-api

# Check rollout status
kubectl rollout status deployment/copilot-api -n copilot-api
```

This comprehensive deployment guide covers all major deployment scenarios and best practices for the Copilot API in production environments.