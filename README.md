# Partner - Pre-Litigation Resolution Platform

Partner reimagines pre-litigation dispute resolution by transforming adversarial demand letters into collaborative resolution pathways. By bringing defendants directly into the platform, Partner creates a two-sided ecosystem where AI facilitates warm, productive communication between creditors and debtors.

## Vision

**"The platform where disputes get resolved, not escalated"**

The demand letter process is broken for everyone:
- Creditors face low response rates and expensive manual follow-up
- Debtors receive intimidating letters with no affordable way to respond
- Result: Disputes escalate unnecessarily, courts are backlogged

Partner solves this by creating a two-sided platform where AI mediates all communication, ensuring dignified treatment for debtors while dramatically improving conversion rates for creditors.

## Core Capabilities

### Demand Generation
- AI-powered creation of FDCPA-compliant demand letters
- Firm-specific template management with version control
- AI refinement based on attorney natural language instructions
- Compliance validation with required disclosures

### Debtor Platform
- Secure invitation link delivery via demand letters
- Warm AI welcome experience with credit-future framing
- AI paraphrasing of legal language into plain terms
- Guided financial capability assessment

### Communication
- Real-time messaging between parties
- AI tone analysis and scoring for all messages
- Warm, non-abrasive rewriting suggestions
- Full communication audit trail

### Resolution
- Collaborative payment plan design
- AI-assisted plan recommendations
- Agreement documentation generation
- Payment tracking and status management

### Intelligence
- Debtor profile embedding generation
- Vector similarity search for pattern matching
- Outcome-based recommendation improvement
- Continuous learning from resolution patterns

### Public Defender Support
- Case assignment and management
- Read-only access to debtor situations
- Secure communication channels
- Case notes and collaboration tools

## Personas

Partner serves four distinct user personas:

| Persona | Role | Platform Function |
|---------|------|-------------------|
| **Firm Admin** | Law firm administrator | Organization management, user provisioning, template oversight |
| **Attorney** | Licensed attorney | Demand letter creation, approval workflows, case oversight |
| **Paralegal** | Legal support staff | Template management, case data entry, communication monitoring |
| **Debtor** | Individual receiving demand | Platform onboarding, financial assessment, payment plan negotiation |
| **Public Defender** | Legal aid provider | Assist debtors in navigating the resolution process |

### Persona Implementation Status

| Persona | Status | Key Features |
|---------|--------|--------------|
| Firm Admin | Implemented | RBAC, organization settings, user management |
| Attorney | Implemented | Letter generation, approval workflow, case management |
| Paralegal | Implemented | Template CRUD, case data management |
| Debtor | Implemented | Onboarding, assessment, messaging, plan negotiation |
| Public Defender | Implemented | Case assignment, read-only view, notes, communication |

## Technology Stack

- **Frontend:** React with TypeScript
- **Backend:** Node.js/Express on AWS Lambda
- **Database:** PostgreSQL 15 with pgvector extension
- **AI/ML:** AWS Bedrock (Claude) for NLP tasks
- **Infrastructure:** Terraform-managed AWS (VPC, RDS, Lambda, API Gateway, S3, KMS)
- **Security:** AES-256-GCM encryption, JWT authentication, RBAC

## Project Structure

```
partner/
├── apps/
│   ├── api/           # Express API (Lambda deployment)
│   │   ├── prisma/    # Database schema
│   │   └── src/
│   │       ├── handlers/      # API route handlers
│   │       ├── services/      # Business logic
│   │       ├── middleware/    # Auth, validation, rate limiting
│   │       └── utils/         # Encryption, tokens, compliance
│   └── web/           # React frontend
│       └── src/
│           └── features/      # Feature modules by persona
├── infra/             # Terraform infrastructure (gitignored)
└── dev_docs/          # Development documentation (gitignored)
    ├── epics/         # Epic specifications
    └── stories/       # User story details
```

## Key Differentiators

1. **Two-Sided by Design** - First platform that genuinely serves both creditors AND debtors
2. **AI Tone Management** - All communications reviewed and shaped for productive outcomes
3. **Debtor Empowerment** - Tools for transparency, payment flexibility, and dignified response
4. **Resolution-Focused** - Success measured by settlements, not escalation
5. **Pattern Learning** - System improves recommendations based on outcome data
6. **FDCPA Compliance** - Built-in validation for regulatory requirements

## Compliance

Partner includes comprehensive FDCPA (Fair Debt Collection Practices Act) compliance:

- Mini-Miranda warning validation
- Validation notice requirement checks
- Creditor identification verification
- Dispute rights disclosure
- Time-barred debt disclosure
- State-specific requirement tracking
- Cease and desist handling
- Communication frequency limits

## Related Documentation

| Document | Contents |
|----------|----------|
| [README-infra.md](README-infra.md) | AWS infrastructure architecture, Terraform deployment steps, resource identifiers, security groups, and infrastructure troubleshooting |
| [README-production-preparedness.md](README-production-preparedness.md) | Production readiness assessment, critical gaps, security audit findings, and recommended remediation timeline |

## Market Context

- **TAM:** $50-65B pre-litigation dispute resolution ecosystem
- **SAM:** $11.5B technology-addressable market
- **Target:** Debt collection disputes (beachhead), expanding to contract and employment disputes

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 15+ with pgvector extension
- AWS credentials (for Bedrock AI and KMS)

### Local Development

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database and AWS credentials

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT token signing |
| `AWS_REGION` | AWS region for Bedrock and KMS |
| `KMS_KEY_ID` | AWS KMS key for encryption |

## License

Proprietary - All rights reserved.
