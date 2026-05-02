# Logging Stack

This project uses Grafana Alloy + Loki + Grafana for centralized log collection and visualization in local development environments.

## Architecture

```
+-------------+       +--------+       +---------+
| App Pods    |------>| Alloy  |------>| Loki    |
| (default    |       | (per   |       | (1Gi    |
|  namespace) |       |  node) |       |  PVC)   |
+-------------+       +--------+       +---------+
                                              |
                                              v
                                        +----------+
                                        | Grafana  |
                                        | (port    |
                                        |  9000)   |
                                        +----------+
```

- **Grafana Alloy**: Runs as a DaemonSet on each node, tails container logs via Kubernetes API (using official `grafana/alloy` Helm chart)
- **Loki**: Single-node log storage with filesystem backend (1Gi PVC, 7-day retention, using official `grafana/loki` Helm chart)
- **Grafana**: Web UI with auto-provisioned Loki datasource (using official `grafana/grafana` Helm chart)

## Quick Start

The logging stack is deployed automatically with the rest of the application. Just run:

```bash
cd infra
skaffold dev
```

This will:
1. Deploy all application services (frontend, backend, processors)
2. Deploy Loki (StatefulSet with 1Gi storage)
3. Deploy Grafana (with anonymous access enabled)
4. Deploy Alloy (DaemonSet on all nodes)
5. Port-forward Grafana to [http://localhost:9000](http://localhost:9000)

## Accessing Grafana

- **URL**: http://localhost:9000
- **Default credentials**: `admin` / `admin`
- **Loki datasource**: Auto-provisioned at `http://loki:3100`

Anonymous access is enabled for local development (Admin role). You can also log in with admin/admin.

## LogQL Query Examples

### View all logs

```logql
{namespace="default"}
```

### Filter by service

```logql
{service="backend"}
```

### Filter by pod name

```logql
{pod=~"backend-.*"}
```

### Filter by container

```logql
{container="backend"}
```

### Search for errors

```logql
{namespace="default"} |= "ERROR"
```

### Combine filters

```logql
{service="backend"} |= "failed" != "debug"
```

### View specific pod logs

```logql
{pod="backend-7d9f4b8c5-x2abc"}
```

## Service Labels

The following labels are automatically added to all logs:

| Label       | Description                           | Example                   |
|-------------|---------------------------------------|---------------------------|
| `namespace` | Kubernetes namespace                  | `default`                 |
| `pod`       | Pod name                              | `backend-7d9f4b8c5-x2abc` |
| `container` | Container name within the pod         | `backend`                 |
| `service`   | Value of `app` label on the pod       | `backend`                 |

## Filtering Logs by Service

All application pods should have an `app` label (e.g., `app: backend`, `app: frontend`). Alloy reads this label and exposes it as the `service` label in Loki.

To view logs for a specific service:

1. Open Grafana at http://localhost:9000
2. Go to **Explore** (compass icon in the left sidebar)
3. Select the **Loki** datasource
4. Use the label filter to select `service="backend"` (or `frontend`, `document-processor`, `embedding-service`)
5. Click **Run query**

## Stopping the Stack

Press `Ctrl+C` in the terminal running `skaffold dev`, or run:

```bash
cd infra
skaffold delete
```

## Storage

Loki stores logs in a 1Gi PVC with a **7-day retention period** (`168h`). Old logs are automatically purged after 7 days. For local development, this is usually sufficient.

To check storage usage:

```bash
kubectl exec -it loki-0 -- df -h /loki
```

## Troubleshooting

### No logs appearing in Grafana

1. Check Alloy is running on the node:
   ```bash
   kubectl get daemonset alloy
   ```

2. Check Alloy logs for errors:
   ```bash
   kubectl logs -l app=alloy --tail=100
   ```

3. Verify Loki is healthy:
   ```bash
   kubectl exec loki-0 -- wget -qO- http://localhost:3100/ready
   ```

4. Check that pods have the `app` label:
   ```bash
   kubectl get pods --show-labels
   ```

### Grafana shows "No Data"

- Ensure the time range in Grafana includes recent data (last 1 hour)
- Check that the Loki datasource is configured (Configuration > Data Sources)
- Verify Loki pod is running: `kubectl get pod loki-0`

## Configuration Files

- `infra/helm/loki/` - Loki Helm wrapper chart (depends on `grafana/loki`)
- `infra/helm/grafana/` - Grafana Helm wrapper chart (depends on `grafana/grafana`)
- `infra/helm/alloy/` - Alloy Helm wrapper chart (depends on `grafana/alloy`)
- `infra/skaffold.yaml` - Skaffold config (includes app services and logging stack)
