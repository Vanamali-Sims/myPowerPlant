# Infrastructure

Terraform for the AWS deployment: S3 + CloudFront (frontend), Lambda + ECR + HTTP API Gateway (backend), SSM Parameter Store (Neon connection string). Database itself is Neon, external to AWS — no RDS/Aurora, no VPC.

## Prerequisites

- Terraform >= 1.7
- AWS credentials with permission to create the resources below (`aws sts get-caller-identity` should succeed)
- Docker, for building/pushing the backend image

## First-time deploy (order matters)

Lambda's container image must already exist in ECR before Terraform can create the function referencing it — Terraform doesn't build or push images itself.

```bash
cd terraform
terraform init

# 1. Create the ECR repo first, nothing else yet
terraform apply -target=aws_ecr_repository.backend

# 2. Build and push the backend image to it
REPO_URL=$(terraform output -raw ecr_repository_url)
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin "$REPO_URL"
docker build -t "$REPO_URL:latest" ../backend
docker push "$REPO_URL:latest"

# 3. Apply everything else
TF_VAR_neon_database_url="postgresql+asyncpg://..." terraform apply
```

Subsequent deploys of a new backend image just need step 2's build/push (or bump `lambda_image_tag` and re-apply) — the ECR-first sequencing is only a first-run concern.

## Supplying the Neon connection string

Never put it in a `.tf` file or commit it. Either:

```bash
TF_VAR_neon_database_url="postgresql+asyncpg://..." terraform apply
```

or a gitignored `secrets.auto.tfvars`:

```hcl
neon_database_url = "postgresql+asyncpg://..."
```

It's stored in SSM Parameter Store as a `SecureString`, referenced by the Lambda's `DATABASE_URL` env var — never hardcoded in this repo.

## Deploying the frontend build

Terraform only provisions the S3 bucket and CloudFront distribution — it doesn't upload the built site. After `npm run build` in `frontend/`:

```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
VITE_API_BASE_URL="$(terraform output -raw api_gateway_endpoint)" npm --prefix ../frontend run build
aws s3 sync ../frontend/dist "s3://$BUCKET" --delete
```

CloudFront caches aggressively — after a sync you may want to invalidate: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.

## Cost notes

Everything here is either Always Free at this project's scale, or close enough to $0 to round to it — with two exceptions worth knowing about, since neither is part of AWS's *Always* Free tier (as opposed to the 12-months-for-new-accounts tier):

- **ECR storage**: the backend image is ~975MB, over the 500MB free allowance either way. Expect a few cents/month. A lifecycle policy expires untagged layers after 7 days to keep this from growing unbounded.
- **API Gateway HTTP API / S3 storage/requests**: free for 12 months on a new account, then metered — at this project's traffic, this is pennies/month, not literally free forever as originally asked for.

CloudFront, Lambda compute/requests, and CloudWatch Logs (with the retention policy set here) are Always Free at this scale with no time limit.

## State

Local state only (no remote backend configured). The state file contains the Neon connection string in plaintext — it's gitignored, but treat it with the same care as the connection string itself. Worth moving to an encrypted remote backend (S3 + DynamoDB lock table) before this is a team-shared or long-lived setup.
