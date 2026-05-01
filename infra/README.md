# AI Knowledge Operations - Infrastructure

This directory contains the Kubernetes deployment configuration for the AI Knowledge Operations system using Helm and Skaffold.

## Architecture

- **Frontend**: Next.js application (port 3000 locally)
- **Backend**: NestJS API with Better Auth (port 3001 locally)
- **MongoDB**: Database for user data and application state (standalone Helm chart)

## Prerequisites

- Kubernetes cluster (local: Docker Desktop, minikube, kind, or k3d)
- Helm 3.x
- Skaffold
- kubectl

## Quick Start (Local Development)

```bash
# From the infra/ directory
skaffold dev
```

This will:
1. Build the frontend and backend Docker images
2. Deploy MongoDB, backend, and frontend to Kubernetes (in that order)
3. Port-forward services to your local machine:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001

## Helm Charts

### MongoDB (`helm/mongodb/`)

Standalone MongoDB chart with Bitnami MongoDB as a dependency. Deploys first to ensure the database is available before the backend starts.

```bash
# Deploy MongoDB independently
helm dependency update helm/mongodb
helm install mongodb helm/mongodb -f values.yaml --namespace default --create-namespace
```

### Backend (`helm/backend/`)

Backend API chart with no external dependencies. Connects to the standalone MongoDB service.

```bash
# Deploy backend independently
helm install backend helm/backend -f values.yaml --namespace default --create-namespace
```

### Frontend (`helm/frontend/`)

Frontend Next.js application. Deploys after MongoDB and backend.

**Required environment variables:**

Create `frontend/.env.local`:
```bash
cat > frontend/.env.local << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF

- `NEXT_PUBLIC_API_URL` — Backend API base URL

## Required Secrets

### Overview

**Secrets MUST be created before deployment.** No credentials are hardcoded in any `values.yaml` file.

Both MongoDB and the backend require Kubernetes Secrets. Create them first, then deploy.

### MongoDB Secret

Create the MongoDB secret with the username and password:

```bash
kubectl create secret generic mongodb-secrets \
  --from-literal=mongodb-root-user='root' \
  --from-literal=mongodb-root-password='your-secure-root-password' \
  -n default
```

The MongoDB chart is pre-configured to use this secret:
```yaml
# helm/mongodb/values.yaml (already set)
mongodb:
  auth:
    existingSecret: mongodb-secrets
```

### Backend Secret

Create the backend secret with authentication credentials (no database URI — the backend constructs it from the MongoDB password):

```bash
kubectl create secret generic backend-secrets \
  --from-literal=GOOGLE_CLIENT_ID='your-google-client-id' \
  --from-literal=GOOGLE_CLIENT_SECRET='your-google-client-secret' \
  --from-literal=BETTER_AUTH_SECRET='your-secure-random-secret' \
  -n default
```

The backend chart is pre-configured to use this secret:
```yaml
# helm/backend/values.yaml (already set)
secrets:
  existingSecretName: backend-secrets
```

**How it works:** The backend constructs the MongoDB connection string from:
- **ConfigMap** (non-sensitive): `MONGODB_HOST`, `MONGODB_PORT`, `MONGODB_DATABASE`, `MONGODB_USER`
- **mongodb-secrets** (sensitive): `mongodb-root-password` → mapped to `MONGODB_PASSWORD` env var

This ensures the password lives in **one place only** (`mongodb-secrets`).

### Quick Start Script

Create both secrets at once:

```bash
#!/bin/bash
MONGO_USER="root"
MONGO_PASSWORD="your-secure-password"  # Change this!

# MongoDB secret (single source of truth for user + password)
kubectl create secret generic mongodb-secrets \
  --from-literal=mongodb-root-user="$MONGO_USER" \
  --from-literal=mongodb-root-password="$MONGO_PASSWORD" \
  -n default

# Backend secret (auth credentials only, no database credentials)
kubectl create secret generic backend-secrets \
  --from-literal=GOOGLE_CLIENT_ID='your-google-client-id' \
  --from-literal=GOOGLE_CLIENT_SECRET='your-google-client-secret' \
  --from-literal=BETTER_AUTH_SECRET='your-secure-random-secret' \
  -n default

echo "Secrets created. Ready to deploy."
```

### Required Environment Variables

| Variable | Description | Source | Chart |
|----------|-------------|--------|-------|
| `MONGODB_HOST` | MongoDB hostname | ConfigMap | Backend |
| `MONGODB_PORT` | MongoDB port | ConfigMap | Backend |
| `MONGODB_DATABASE` | MongoDB database name | ConfigMap | Backend |
| `MONGODB_USER` | MongoDB username | Secret (`mongodb-secrets`) | Backend |
| `MONGODB_PASSWORD` | MongoDB password | Secret (`mongodb-secrets`) | Backend |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Secret (`backend-secrets`) | Backend |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | Secret (`backend-secrets`) | Backend |
| `BETTER_AUTH_SECRET` | Better Auth secret key | Secret (`backend-secrets`) | Backend |
| `BETTER_AUTH_URL` | Backend base URL | ConfigMap (auto) | Backend |
| `FRONTEND_URL` | Frontend URL for CORS | ConfigMap (auto) | Backend |
| `GOOGLE_REDIRECT_URI` | Google OAuth redirect URI | ConfigMap (auto) | Backend |
| `NEXT_PUBLIC_API_URL` | Frontend API base URL | `.env.local` | Frontend |
| `mongodb-root-user` | MongoDB root username | Secret (`mongodb-secrets`) | MongoDB |
| `mongodb-root-password` | MongoDB root password | Secret (`mongodb-secrets`) | MongoDB |

## MongoDB Configuration

MongoDB is deployed as a standalone Helm chart at `helm/mongodb/`. It uses the Bitnami MongoDB chart as a dependency. Configuration in `helm/mongodb/values.yaml`:

```yaml
mongodb:
  architecture: standalone
  auth:
    enabled: true
    existingSecret: mongodb-secrets
  persistence:
    enabled: false  # Uses emptyDir (data lost on restart)
```

For production, enable persistence:

```yaml
mongodb:
  persistence:
    enabled: true
    size: 10Gi
```

### Accessing MongoDB

From inside the cluster:
```
mongodb://<user>:<password>@mongodb:27017/ai-knowledge
```

Port-forward for local access:
```bash
kubectl port-forward svc/mongodb 27017:27017
```

## Manual Deployment (Without Skaffold)

### Deploy All Components

```bash
# Update MongoDB dependencies (downloads Bitnami chart)
helm dependency update helm/mongodb

# Deploy MongoDB first (backend depends on it)
helm install mongodb helm/mongodb -f values.yaml --namespace default --create-namespace

# Wait for MongoDB to be ready
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=mongodb --timeout=120s

# Deploy backend
helm install backend helm/backend -f values.yaml --namespace default

# Deploy frontend
helm install frontend helm/frontend -f values.yaml --namespace default
```

### Upgrade Individual Components

```bash
# Upgrade MongoDB only
helm upgrade mongodb helm/mongodb -f values.yaml --namespace default

# Upgrade backend only
helm upgrade backend helm/backend -f values.yaml --namespace default

# Upgrade frontend only
helm upgrade frontend helm/frontend -f values.yaml --namespace default
```

### Verify
```bash
kubectl get pods -n default
kubectl get svc -n default
```

## Health Checks

The backend exposes a health endpoint at `/health` which is used for:
- **Liveness Probe**: Restarts the pod if unhealthy (30s initial delay)
- **Readiness Probe**: Removes pod from service if not ready (5s initial delay)

## Updating / Redeploying

### Update Code Only
```bash
skaffold dev
# Automatically rebuilds and redeploys on file changes
```

### Update Dependencies
```bash
# Update MongoDB chart version
helm dependency update helm/mongodb
skaffold run
```

### Update Secrets

**Backend secrets:**
```bash
# Delete and recreate secret
kubectl delete secret backend-secrets -n default
kubectl create secret generic backend-secrets \
  --from-literal=GOOGLE_CLIENT_ID='your-google-client-id' \
  --from-literal=GOOGLE_CLIENT_SECRET='your-google-client-secret' \
  --from-literal=BETTER_AUTH_SECRET='your-secure-random-secret' \
  -n default

# Restart deployment to pick up new secrets
kubectl rollout restart deployment/backend-backend -n default
```

**MongoDB secrets (single source of truth for user + password):**
```bash
# Delete and recreate secret
kubectl delete secret mongodb-secrets -n default
kubectl create secret generic mongodb-secrets \
  --from-literal=mongodb-root-user='root' \
  --from-literal=mongodb-root-password='your-secure-root-password' \
  -n default

# Restart both MongoDB and backend to pick up the new credentials
kubectl rollout restart statefulset/mongodb -n default
kubectl rollout restart deployment/backend-backend -n default
```

## Resource Limits

Default resource configuration:

| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|-----------|-------------|-----------|----------------|--------------|
| Backend | 100m | 500m | 128Mi | 512Mi |
| MongoDB | 100m | 500m | 256Mi | 512Mi |

Adjust in each chart's `values.yaml` as needed.

## Troubleshooting

### Check pod status
```bash
kubectl get pods -n default
kubectl describe pod <pod-name> -n default
```

### View backend logs
```bash
kubectl logs -f deployment/backend-backend -n default
```

### View MongoDB logs
```bash
kubectl logs -f deployment/mongodb -n default
```

### Helm template debugging
```bash
# Render MongoDB templates
helm template mongodb helm/mongodb -f values.yaml

# Render backend templates
helm template backend helm/backend -f values.yaml
```

## Production Considerations

1. **Secrets**: Use a secrets manager (AWS Secrets Manager, Azure Key Vault, or Sealed Secrets)
2. **Persistence**: Enable MongoDB persistence with appropriate storage class
3. **Replicas**: Increase `replicaCount` for backend high availability
4. **Resources**: Right-size CPU/memory based on actual usage
5. **Monitoring**: Install Prometheus/Grafana for metrics
6. **Ingress**: Configure Ingress for external access instead of port-forwarding
7. **Backups**: Set up MongoDB backup jobs
8. **Network Policies**: Restrict inter-pod communication

## Cleanup

```bash
# Remove all Helm releases
helm uninstall mongodb -n default
helm uninstall backend -n default
helm uninstall frontend -n default

# Or with Skaffold
skaffold delete
```
