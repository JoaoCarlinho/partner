# Infrastructure Documentation

This document describes the AWS infrastructure provisioned for the Partner platform and the steps to deploy it.

## Overview

The infrastructure is defined using Terraform and deployed to AWS. It provides a secure, scalable foundation for the Partner application including:

- VPC with public/private subnet architecture
- RDS PostgreSQL with pgvector for AI embeddings
- Lambda functions with VPC connectivity
- API Gateway (REST + WebSocket)
- S3 storage with KMS encryption
- SQS queues for async processing
- Bedrock VPC endpoints for AI (PrivateLink)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                          VPC                                │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │  Public Subnet  │          │  Public Subnet  │          │
│  │     (AZ-a)      │          │     (AZ-b)      │          │
│  │  ┌───────────┐  │          │  ┌───────────┐  │          │
│  │  │    IGW    │  │          │  │    NAT    │  │          │
│  │  └───────────┘  │          │  └───────────┘  │          │
│  └─────────────────┘          └─────────────────┘          │
│  ┌─────────────────┐          ┌─────────────────┐          │
│  │ Private Subnet  │          │ Private Subnet  │          │
│  │     (AZ-a)      │          │     (AZ-b)      │          │
│  │  ┌───────────┐  │          │  ┌───────────┐  │          │
│  │  │  Lambda   │  │          │  │    RDS    │  │          │
│  │  └───────────┘  │          │  │ (pgvector)│  │          │
│  │  ┌───────────┐  │          │  └───────────┘  │          │
│  │  │  Bedrock  │  │          │                 │          │
│  │  │ Endpoint  │  │          │                 │          │
│  │  └───────────┘  │          │                 │          │
│  └─────────────────┘          └─────────────────┘          │
└─────────────────────────────────────────────────────────────┘
```

## Deployed Resources (Prod Environment)

| Resource | Identifier/Endpoint |
|----------|---------------------|
| VPC | vpc-0a3c1f4a4ab5fb370 |
| RDS PostgreSQL 15.10 | steno-dev-postgres.crws0amqe1e3.us-east-1.rds.amazonaws.com |
| Elastic Beanstalk API | http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com |
| Frontend (CloudFront) | https://d13ip2cieye91r.cloudfront.net |
| S3 Frontend | steno-dev-frontend |
| S3 Documents | steno-dev-documents-10ed79cd |
| S3 Templates | steno-dev-templates-10ed79cd |
| KMS CMK | alias/steno-dev-platform |

**Note:** The API was migrated from Lambda/API Gateway to Elastic Beanstalk for improved performance and cost efficiency.

## Deployment Steps

### Prerequisites

1. AWS CLI configured with appropriate credentials
2. Terraform >= 1.0 installed
3. AWS credentials with admin access (or scoped IAM policy)

### Step 1: Set AWS Credentials

```bash
# Export credentials (or use AWS profile)
export AWS_ACCESS_KEY_ID="your-access-key"
export AWS_SECRET_ACCESS_KEY="your-secret-key"
export AWS_DEFAULT_REGION="us-east-1"

# Or source from a tokens file (gitignored)
source ./tokens
```

### Step 2: Initialize Terraform

```bash
cd infra/environments/dev
terraform init
```

### Step 3: Review and Apply

```bash
# Preview changes
terraform plan

# Apply infrastructure
terraform apply
```

This creates ~122 AWS resources including VPC, subnets, RDS, Lambda functions, API Gateway, S3 buckets, SQS queues, and VPC endpoints.

### Step 4: Install pgvector Extension

The pgvector extension must be installed manually after RDS creation. Since RDS is in a private subnet (not publicly accessible), use a Lambda function or bastion host:

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Verify installation:
```sql
SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';
-- Expected: vector | 0.8.0
```

### Step 5: Deploy Lambda Code

The Terraform creates placeholder Lambda functions. Deploy actual application code:

```bash
# Build and deploy (implementation depends on your CI/CD)
cd src/
npm run build
# Upload to Lambda via AWS CLI, SAM, or Serverless Framework
```

## Project Structure

```
infra/
├── main.tf                 # Root module orchestration
├── variables.tf            # Input variables
├── outputs.tf              # Output values
├── modules/
│   ├── networking/         # VPC, subnets, security groups
│   ├── database/           # RDS PostgreSQL
│   ├── api/                # API Gateway, Lambda
│   ├── storage/            # S3 buckets
│   ├── security/           # KMS, Secrets Manager, IAM
│   ├── ai/                 # Bedrock VPC endpoints
│   ├── messaging/          # SQS, WebSocket
│   ├── ssl/                # ACM certificates
│   └── monitoring/         # CloudWatch logs, alarms
└── environments/
    ├── dev/                # Development config
    ├── staging/            # Staging config
    └── prod/               # Production config
```

## MVP Shortcuts vs Production Best Practices

This infrastructure was deployed for rapid MVP development. The following shortcuts were taken that should be addressed for production:

### 1. Terraform State Management

**MVP Approach:**
- Local Terraform state file (`terraform.tfstate`)
- State stored on developer machine

**Production Approach:**
```hcl
# backend.tf
terraform {
  backend "s3" {
    bucket         = "company-terraform-state"
    key            = "partner/prod/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```
- Remote state in S3 with encryption
- DynamoDB table for state locking
- Prevents concurrent modifications
- Enables team collaboration

### 2. SSL/TLS Certificates

**MVP Approach:**
- Using default Elastic Beanstalk URL: `http://steno-prod-backend-vpc.eba-exhpmgyi.us-east-1.elasticbeanstalk.com`
- Frontend via CloudFront with HTTPS: `https://d13ip2cieye91r.cloudfront.net`
- No custom domain

**Production Approach:**
- Custom domain (e.g., `api.partner.com`)
- ACM certificate with DNS validation
- Route 53 hosted zone for DNS
- Load balancer with HTTPS termination

### 3. Database Access

**MVP Approach:**
- Temporary Lambda function to install pgvector
- Manual SQL execution for schema changes

**Production Approach:**
- Bastion host in public subnet for DB access
- AWS Systems Manager Session Manager
- Database migration tools (Flyway, Prisma Migrate)
- Automated schema deployment in CI/CD

### 4. Secrets Management

**MVP Approach:**
- Credentials stored in Secrets Manager
- Manual initial secret values
- `tokens` file for local AWS credentials (gitignored)

**Production Approach:**
- Secrets rotation enabled
- Integration with CI/CD for secret injection
- IAM roles for cross-account access
- No local credential files

### 5. Multi-AZ and High Availability

**MVP Approach:**
- Single NAT Gateway
- RDS Multi-AZ disabled for cost savings
- Single AZ for some resources

**Production Approach:**
- NAT Gateway per AZ
- RDS Multi-AZ enabled
- Auto-scaling for Lambda
- Cross-region disaster recovery

### 6. Monitoring and Alerting

**MVP Approach:**
- Basic CloudWatch alarms
- SNS topic created but not subscribed
- 30-day log retention

**Production Approach:**
- Comprehensive alerting with PagerDuty/Opsgenie integration
- Custom metrics and dashboards
- 90+ day log retention
- X-Ray tracing enabled
- Log aggregation (CloudWatch Insights, Datadog, etc.)

### 7. Network Security

**MVP Approach:**
- Security groups allow necessary traffic
- VPC endpoints for AWS services
- No WAF

**Production Approach:**
- AWS WAF on API Gateway
- Network ACLs as additional layer
- VPC Flow Logs enabled
- GuardDuty for threat detection
- Security Hub for compliance

### 8. CI/CD and Infrastructure as Code

**MVP Approach:**
- Manual `terraform apply` from local machine
- No automated testing
- No Git LFS for large files

**Production Approach:**
- GitOps workflow (GitHub Actions, GitLab CI)
- Terraform plan on PR, apply on merge
- Infrastructure tests (Terratest, Checkov)
- Policy as Code (OPA, Sentinel)
- Git LFS for Lambda deployment packages

### 9. Cost Optimization

**MVP Approach:**
- Smallest instance sizes
- S3 lifecycle rules for cost management
- No reserved capacity

**Production Approach:**
- Reserved Instances for RDS
- Savings Plans for Lambda
- S3 Intelligent Tiering
- Cost allocation tags
- Budget alerts

### 10. Backup and Recovery

**MVP Approach:**
- RDS automated backups (7 days)
- S3 versioning enabled
- No cross-region replication

**Production Approach:**
- Longer backup retention (35 days)
- Cross-region RDS read replica
- S3 cross-region replication
- Documented RTO/RPO targets
- Regular DR drills

## Security Groups Reference

| Security Group | Inbound | Outbound | Purpose |
|----------------|---------|----------|---------|
| lambda-sg | - | All (VPC) | Lambda functions |
| rds-sg | 5432 from lambda-sg | - | RDS PostgreSQL |
| bedrock-endpoint-sg | 443 from lambda-sg | - | Bedrock PrivateLink |
| vpc-endpoint-sg | 443 from lambda-sg | - | Other VPC endpoints |

## Useful Commands

```bash
# View Terraform state
terraform state list

# Get specific output
terraform output api_gateway_url

# Destroy infrastructure (careful!)
terraform destroy

# Format Terraform files
terraform fmt -recursive

# Validate configuration
terraform validate
```

## Troubleshooting

### Lambda can't connect to RDS
1. Verify Lambda is in private subnets
2. Check security group allows 5432 from lambda-sg
3. Confirm RDS is in database subnet group

### Bedrock calls fail
1. Verify VPC endpoint exists for bedrock-runtime
2. Check security group allows 443 from lambda-sg
3. Confirm private DNS is enabled on endpoint

### Terraform state lock
```bash
# If state is locked (use with caution)
terraform force-unlock LOCK_ID
```

## References

- [Architecture Document](docs/architecture.md)
- [Story 1-0: Infrastructure Provisioning](docs/stories/1-0-infrastructure-provisioning-with-terraform.md)
- [AWS Terraform Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
