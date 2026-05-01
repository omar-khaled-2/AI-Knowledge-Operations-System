# Infrastructure as Code - Terraform

This directory contains Terraform configurations for managing cloud infrastructure across multiple environments.

## Directory Structure

```
infra/
├── modules/                    # Reusable Terraform modules
│   ├── vpc/                   # VPC and networking module
│   ├── compute/               # Compute resources (EC2, ASG, etc.)
│   ├── database/              # Database resources (RDS, DynamoDB, etc.)
│   └── networking/            # Load balancers, CDN, DNS
├── environments/              # Environment-specific configurations
│   ├── dev/                   # Development environment
│   ├── staging/               # Staging/QA environment
│   └── prod/                  # Production environment
├── .gitignore                 # Ignores Terraform state and artifacts
└── README.md                  # This file
```

## Architecture Principles

1. **DRY (Don't Repeat Yourself)**: Common patterns are encapsulated in modules
2. **Environment Isolation**: Each environment has its own directory and state
3. **Immutable Infrastructure**: Changes are made through code, not manual edits
4. **Version Pinning**: All providers and modules use version constraints
5. **Least Privilege**: IAM roles and security groups follow principle of least privilege

## Getting Started

### Prerequisites

- [Terraform](https://www.terraform.io/downloads.html) >= 1.5.0
- [AWS CLI](https://aws.amazon.com/cli/) configured with appropriate credentials
- Access to the Terraform state backend (S3 + DynamoDB)

### Workflow

1. **Initialize**: `terraform init`
2. **Plan**: `terraform plan -var-file="terraform.tfvars"`
3. **Apply**: `terraform apply -var-file="terraform.tfvars"`
4. **Destroy** (dev only): `terraform destroy -var-file="terraform.tfvars"`

### Environment Deployment

```bash
# Development
cd environments/dev
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"

# Production (requires approval)
cd environments/prod
terraform init
terraform plan -var-file="terraform.tfvars"
terraform apply -var-file="terraform.tfvars"
```

## State Management

State is stored remotely in S3 with DynamoDB locking to prevent concurrent modifications.

## Contributing

1. Make changes in a feature branch
2. Run `terraform fmt` to format code
3. Run `terraform validate` to verify syntax
4. Submit a pull request for review
5. Apply changes through CI/CD pipeline

## Security Notes

- Never commit `.tfstate` files or sensitive variables
- Use AWS Secrets Manager or Parameter Store for sensitive values
- All variables are defined in `variables.tf` with descriptions
- Backend encryption is enabled for state files

## Troubleshooting

### Common Issues

**State Lock Errors**: If a previous run was interrupted, you may need to force-unlock:
```bash
terraform force-unlock <LOCK_ID>
```

**Provider Version Conflicts**: Run `terraform init -upgrade` to update providers

**Backend Configuration**: Ensure you have access to the S3 bucket and DynamoDB table specified in `backend.tf`

## Resources

- [Terraform Best Practices](https://www.terraform-best-practices.com/)
- [AWS Provider Documentation](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [Terraform Module Registry](https://registry.terraform.io/)
