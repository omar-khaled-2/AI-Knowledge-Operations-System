# Architecture Decision Record: Terraform Directory Structure

## Status
Accepted

## Context
We needed to establish a standardized Terraform directory structure that:
- Supports multiple environments (dev, staging, prod)
- Promotes code reusability through modules
- Enables team collaboration with remote state
- Follows Terraform and AWS best practices

## Decision
We adopted a monorepo structure with environment separation through directories rather than workspaces.

### Key decisions:
1. **Directory-based environments** instead of Terraform workspaces for stronger isolation
2. **Module-per-resource-type** pattern for reusability
3. **Remote state with S3 + DynamoDB** for team collaboration and state locking
4. **Explicit provider versioning** to prevent unexpected upgrades
5. **tfvars files per environment** for configuration management

## Consequences

### Positive
- Clear separation of environments
- Easy to understand and navigate
- Modules can be versioned independently
- State is isolated per environment

### Negative
- Some code duplication across environments (mitigated by modules)
- Larger repository size
- Need to manage module source paths

## Alternatives Considered

### Terraform Workspaces
- Rejected: Less isolation, harder to manage different backend configs

### Separate Repositories per Environment
- Rejected: Harder to share modules, more complex CI/CD

### Terragrunt
- Rejected: Adds complexity, team not familiar with it yet
