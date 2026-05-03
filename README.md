# AI Knowledge Operations System

An intelligent document management and AI chat platform built with modern microservices architecture.

## Overview

The AI Knowledge Operations System enables organizations to **ingest documents**, **generate AI-powered insights**, and **interact with their knowledge base** through an intelligent chat interface with RAG (Retrieval Augmented Generation) capabilities.

### Key Features

- **Document Ingestion** — Upload and process PDF, Markdown, and text documents with semantic chunking
- **Semantic Search** — Vector-based retrieval using OpenAI embeddings and Qdrant vector database
- **AI Chat** — Context-aware conversational interface with real-time streaming responses
- **Project Management** — Multi-tenant project isolation for organizing documents and conversations
- **Real-time Collaboration** — WebSocket-based live updates and streaming AI responses
- **AI Insights** — Automated analysis and insight generation from document collections

## System Architecture

The system follows an **event-driven microservices architecture** with clear separation of concerns:

```
┌─────────────┐      ┌─────────────┐      ┌─────────────────────────────────────┐
│  Frontend   │─────►│   Backend   │─────►│         Microservices                │
│  (Next.js)  │◄─────│   (NestJS)  │◄─────│  • Chat Service      (AI/RAG)      │
│             │  WS  │             │      │  • Retrieval Service (Search)       │
└─────────────┘      └──────┬──────┘      │  • Document Processor (Parsing)     │
                            │             │  • Embedding Service (Vectors)      │
                            ▼             │  • Insight Service   (Analysis)     │
                     ┌─────────────┐      └─────────────────────────────────────┘
                     │   Redis     │
                     │   MongoDB   │      ┌─────────────────────────────────────┐
                     │   RabbitMQ  │─────►│         Data Stores                  │
                     │   Qdrant    │      │  • MongoDB  (Documents, Users)      │
                     └─────────────┘      │  • Qdrant   (Vector Embeddings)     │
                                          │  • S3       (File Storage)          │
                                          └─────────────────────────────────────┘
```

📖 **For detailed architecture documentation, see [ARCHITECTURE.md](./ARCHITECTURE.md)**

## Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui | Web application |
| **Backend API** | NestJS, TypeScript | REST API gateway |
| **WebSocket** | Bun, TypeScript, Socket.io | Real-time communication |
| **AI Services** | Python, FastAPI | Chat, retrieval, insights |
| **Data** | MongoDB, Redis, Qdrant, RabbitMQ, S3 | Storage & messaging |
| **Infrastructure** | Kubernetes, Skaffold, Terraform | Deployment & IaC |
| **Observability** | Grafana, Loki, Alloy | Monitoring & logging |

## Required Secrets

Before running the system, you need to configure the following secrets and API keys:

### 1. Copy Environment Files

```bash
cp .env.example .env
cp backend/.env.example backend/.env
```

### 2. Required API Keys

| Secret | Purpose | How to Obtain |
|--------|---------|---------------|
| `OPENAI_API_KEY` | AI embeddings, chat, and insights | [OpenAI Platform](https://platform.openai.com/api-keys) |
| `GOOGLE_CLIENT_ID` | OAuth2 authentication | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | OAuth2 authentication | [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `AWS_ACCESS_KEY_ID` | S3 document storage | [AWS IAM Console](https://console.aws.amazon.com/iam/) |
| `AWS_SECRET_ACCESS_KEY` | S3 document storage | [AWS IAM Console](https://console.aws.amazon.com/iam/) |
| `S3_BUCKET` | Document file storage | Create in [AWS S3 Console](https://s3.console.aws.amazon.com/) |

### 3. Backend Secrets (`.env` in `backend/`)

```env
# Authentication
BETTER_AUTH_SECRET=your-random-secret-key-here
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/auth/callback/google

# Database
MONGODB_HOST=mongodb
MONGODB_PORT=27017
MONGODB_DATABASE=ai-knowledge-ops
MONGODB_USER=root
MONGODB_PASSWORD=admin

# Message Queue
RABBITMQ_URL=amqp://guest:guest@rabbitmq:5672

# S3 Storage
S3_REGION=us-east-1
S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

### 4. Shared Secrets (root `.env`)

```env
# AI / LLM
OPENAI_API_KEY=sk-your-openai-api-key-here

# Google OAuth
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret

# AWS S3
S3_REGION=us-east-1
S3_BUCKET=your-s3-bucket-name
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
```

> ⚠️ **Never commit `.env` files to git.** They are already in `.gitignore`.

---

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) 20+
- [Bun](https://bun.sh/) 1.0+
- [Python](https://python.org/) 3.11+
- [Docker](https://docker.com/) & [Kubernetes](https://kubernetes.io/) (kind/minikube)
- [Skaffold](https://skaffold.dev/)

### Local Development

The fastest way to get started is using Skaffold for local Kubernetes development:

```bash
# Clone the repository
git clone <repository-url>
cd AI-Knowledge-Operations-System

# Start all services (builds images and deploys to local K8s)
cd infra
skaffold dev
```

This will:
- Build all service Docker images
- Deploy to local Kubernetes cluster
- Port-forward services to localhost:
  - **Frontend**: http://localhost:3000
  - **Backend API**: http://localhost:3001
  - **WebSocket Gateway**: ws://localhost:3002
  - **Grafana**: http://localhost:9000
  - **RabbitMQ Management**: http://localhost:15672

### Individual Service Development

Each service can be developed independently. See the README in each service directory:

- [Frontend](./frontend/README.md)
- [Backend](./backend/README.md)
- [Chat Service](./services/chat-service/README.md)
- [Retrieval Service](./services/retrieval-service/README.md)
- [Document Processor](./services/document-processor/README.md)
- [Embedding Service](./services/embedding-service/README.md)

## Helm Repositories

The infrastructure uses the following Helm chart repositories. Add them before deploying:

```bash
# Bitnami charts (MongoDB, Redis)
helm repo add bitnami https://charts.bitnami.com/bitnami

# Bitnami OCI registry (alternative for Redis)
helm repo add bitnami-oci oci://registry-1.docker.io/bitnamicharts

# Qdrant vector database
helm repo add qdrant https://qdrant.github.io/qdrant-helm

# Grafana observability stack
helm repo add grafana https://grafana.github.io/helm-charts

# Update repositories
helm repo update
```

### Chart Dependencies

| Service | Chart Source | Repository |
|---------|-------------|------------|
| **MongoDB** | `bitnami/mongodb` | `https://charts.bitnami.com/bitnami` |
| **Redis** | `bitnami/redis` | `oci://registry-1.docker.io/bitnamicharts` |
| **Qdrant** | `qdrant/qdrant` | `https://qdrant.github.io/qdrant-helm` |
| **Grafana** | `grafana/grafana` | `https://grafana.github.io/helm-charts` |
| **Loki** | Custom wrapper | Local chart in `infra/helm/loki/` |
| **Alloy** | Custom wrapper | Local chart in `infra/helm/alloy/` |
| **RabbitMQ** | Custom wrapper | Local chart in `infra/helm/rabbitmq/` |
| **App Services** | Custom charts | Local charts in `infra/helm/*-service/` |

---

## Project Structure

```
AI-Knowledge-Operations-System/
├── frontend/                 # Next.js web application
├── backend/                  # NestJS API server
├── services/                 # Python microservices
│   ├── chat-service/         # AI chat processing
│   ├── retrieval-service/    # Semantic search
│   ├── document-processor/   # Document parsing & chunking
│   ├── embedding-service/    # Vector embedding generation
│   ├── websocket-gateway/    # Standalone WebSocket server
│   └── insight-service/      # AI insight generation
├── infra/                    # Infrastructure (K8s, Terraform)
├── docs/                     # Documentation & specs
└── tests/                    # Integration & E2E tests
```

## Documentation

- **[ARCHITECTURE.md](./ARCHITECTURE.md)** — Complete system architecture, data flows, and deployment details
- **[LOGGING.md](./LOGGING.md)** — Centralized logging stack documentation
- **Service READMEs** — Individual service documentation in each `services/*/README.md`
- **Design Specs** — Feature specifications in `docs/superpowers/specs/`

## Development Workflow

This project uses **superpowers** development workflow with structured design and planning:

1. **Design Phase** — Feature specs written to `docs/superpowers/specs/`
2. **Planning Phase** — Implementation plans in `docs/superpowers/plans/`
3. **Implementation** — Code changes with tests
4. **Verification** — Automated testing and manual verification

## Contributing

1. Check existing specs in `docs/superpowers/specs/` for context
2. Create a feature branch
3. Follow the coding standards in `.opencode/skills/coding-standards/`
4. Write tests for new features
5. Submit a pull request

## License

[MIT License](./LICENSE)

---

**Status**: Active Development | **Version**: 1.0.0-alpha
