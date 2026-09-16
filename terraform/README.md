# Infrastructure

Terraform for the AWS deployment: S3 + CloudFront (frontend), Lambda + ECR + HTTP API Gateway (backend), SSM Parameter Store (Neon connection string). Database itself is Neon, external to AWS, so there is no RDS/Aurora and no VPC.

## Prerequisites

- Terraform >= 1.10 (needed for native S3 state locking, see the State section below)
- AWS credentials with permission to create the resources below (`aws sts get-caller-identity` should succeed)
- Docker, for building/pushing the backend image

## First-time deploy (order matters)

Lambda's container image must already exist in ECR before Terraform can create the function referencing it. Terraform doesn't build or push images itself.

```bash
cd terraform
terraform init

# 1. Create the ECR repo first, nothing else yet
terraform apply -target=aws_ecr_repository.backend

# 2. Build and push the backend image to it, tagged with the current commit
REPO_URL=$(terraform output -raw ecr_repository_url)
TAG=$(git rev-parse --short HEAD)
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin "$REPO_URL"
docker build -t "$REPO_URL:$TAG" ../backend
docker push "$REPO_URL:$TAG"

# 3. Apply everything else, stating exactly which tag to deploy
TF_VAR_neon_database_url="postgresql+asyncpg://..." terraform apply -var="lambda_image_tag=$TAG"
```

Subsequent deploys of a new backend image just need step 2's build/push with a new tag, then step 3 again with that tag. The ECR-first sequencing is only a first-run concern.

`lambda_image_tag` has no default on purpose, so every apply, here or in CI, has to say explicitly which image it means to deploy rather than falling back to some fixed tag that could point at a different image than what is actually running.

## Supplying the Neon connection string

Never put it in a `.tf` file or commit it. Either:

```bash
TF_VAR_neon_database_url="postgresql+asyncpg://..." terraform apply
```

or a gitignored `secrets.auto.tfvars`:

```hcl
neon_database_url = "postgresql+asyncpg://..."
```

It's stored in SSM Parameter Store as a `SecureString`, referenced by the Lambda's `DATABASE_URL` env var, and never hardcoded in this repo. The `aws_ssm_parameter.database_url` resource ignores changes to its value after creation (see `ssm.tf`), so setting or rotating it is always a deliberate manual apply from a local machine, never something CI does automatically. See the CI/CD section below for why.

## Deploying the frontend build

Terraform only provisions the S3 bucket and CloudFront distribution. It doesn't upload the built site. After `npm run build` in `frontend/`:

```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
VITE_API_BASE_URL="$(terraform output -raw api_gateway_endpoint)" npm --prefix ../frontend run build
aws s3 sync ../frontend/dist "s3://$BUCKET" --delete
```

CloudFront caches aggressively, so after a sync you may want to invalidate: `aws cloudfront create-invalidation --distribution-id <id> --paths "/*"`.

## Cost notes

Everything here is either Always Free at this project's scale, or close enough to $0 to round to it, with two exceptions worth knowing about, since neither is part of AWS's *Always* Free tier (as opposed to the 12-months-for-new-accounts tier):

- **ECR storage**: the backend image is ~975MB, over the 500MB free allowance either way. Expect a few cents/month. A lifecycle policy expires untagged layers after 7 days, and a second lifecycle rule keeps only the 10 most recently pushed tagged images, so storage does not grow unbounded as CI pushes a new tagged image on every deploy.
- **API Gateway HTTP API / S3 storage/requests**: free for 12 months on a new account, then metered. At this project's traffic, this is pennies per month, not literally free forever.

CloudFront, Lambda compute/requests, and CloudWatch Logs (with the retention policy set here) are Always Free at this scale with no time limit.

## State

Remote state in S3, with native S3 locking rather than the older DynamoDB lock table pattern. Native locking (the `use_lockfile` setting in the `backend "s3"` block in `versions.tf`) was added in Terraform 1.10 and needs no separate lock table, IAM permissions for one, or cost to maintain, which is why it was chosen here over DynamoDB now that it is available.

The S3 bucket that holds this state is itself managed by a separate, small Terraform config in `terraform/bootstrap`, applied once by hand, with its own local state. It has to be separate: the bucket holding state cannot be created by the same apply that needs that bucket to exist first, and keeping it separate also means a `terraform destroy` on this main stack can never take the state bucket down with it. See `terraform/bootstrap/main.tf` for that config.

This backend works the same way for a manual local apply and for the CI pipeline described below. Anyone with AWS credentials and this repository can run `terraform init` here and get the same shared state and locking; the remote backend does not lock manual use out.

## CI/CD

A GitHub Actions workflow at `.github/workflows/deploy.yml` deploys both the frontend and backend on every push to the `main` branch, plus a manual `workflow_dispatch` trigger for testing the pipeline by hand. Pushes to `development` do not trigger any deployment. Merge `development` into `main` only when the change is ready to go live; that merge is the deliberate "go live" moment.

### Authentication

The pipeline authenticates to AWS using OIDC federation (see `terraform/oidc.tf`), not a long-lived access key. GitHub issues a short-lived token for each workflow run, which is exchanged for temporary AWS credentials scoped to a role that trusts only this repository and only the `main` branch. No AWS credential of any kind is stored as a GitHub secret.

### Required repository variables

Configure these under Settings > Secrets and variables > Actions > Variables. None of them are secret values, so they are variables, not secrets, and this workflow does not require any repository secrets at all.

| Variable | Value | Where to find it |
| --- | --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | Role ARN the workflow assumes via OIDC | `terraform output github_actions_role_arn` |
| `API_BASE_URL` | Live API Gateway URL, set as the frontend build's `VITE_API_BASE_URL` | `terraform output api_gateway_endpoint` |
| `FRONTEND_BUCKET_NAME` | S3 bucket the built frontend is synced to | `terraform output frontend_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | Distribution invalidated after each sync | `aws cloudfront list-distributions` |
| `ECR_REPOSITORY_URL` | Repository the backend image is pushed to | `terraform output ecr_repository_url` |

### Image tagging

Every push builds and pushes a backend image tagged with the full git commit SHA of that push, never `latest` or any other mutable tag. Terraform detects a Lambda update by comparing the `image_uri` string on the function, so if every build reused the same mutable tag, Terraform would see no difference on a genuinely new image and silently leave the Lambda running old code. If a deployed Lambda ever looks stale, check its running image tag against the latest commit SHA on `main` rather than assuming a tag called `latest` is actually the latest build.

### Image retention

Because every deploy now leaves a permanently tagged image in ECR instead of overwriting one `latest` tag, `ecr.tf` has a second lifecycle rule (alongside the existing untagged-image rule) that keeps only the 10 most recently pushed tagged images. Older tagged images are expired automatically, which keeps storage bounded while still leaving enough recent history to roll back to a previous image by hand if needed, by re-running `terraform apply` with an older SHA as `lambda_image_tag`, as long as that image is still within the last 10.

### Docker build flags

The backend image is built with `--provenance=false --sbom=false`, since Lambda's container image support rejects the OCI-format attestations that `docker build` attaches by default otherwise.
