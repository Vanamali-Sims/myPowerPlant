# Infrastructure

This folder holds the Terraform for MyPowerPlant on AWS. In normal use you will not run it by hand. Every push to `main` runs it from CI. This guide is for the first setup, for changing secrets, and for when something needs fixing manually.

## What it creates

Everything is in `ap-southeast-2`, except the certificates, which CloudFront requires to be in `us-east-1`. Resource names start with `mypowerplant-production`.

| Area | Resources | File |
| --- | --- | --- |
| Frontend | Private S3 bucket, CloudFront distribution on `mypowerplant.tech`, security headers policy, and a CloudFront Function that routes the iteration snapshots | `s3.tf`, `cloudfront.tf` |
| Certificates | ACM certificates for `mypowerplant.tech` (in use) and `app.mypowerplant.tech` (the old domain, no longer attached) | `acm.tf` |
| Backend | ECR repository, Lambda function running the container image on arm64, CloudWatch log group with 14 days of retention | `ecr.tf`, `lambda.tf` |
| API | HTTP API Gateway with one catch-all route, throttled to 10 requests per second with a burst of 40 | `apigateway.tf` |
| Secrets | Two SSM SecureString parameters, see below | `ssm.tf` |
| Access | Lambda execution role, GitHub Actions deploy role, GitHub OIDC provider | `iam.tf`, `oidc.tf` |

The database is Neon Postgres, outside AWS. That is why there is no RDS, Aurora or VPC here.

### Public addresses and the CloudFront Function

The site is public, with no password. It is served at https://mypowerplant.tech, and https://d3rvyrwejm3499.cloudfront.net is a backup address for the same distribution. The backend allows both as CORS origins.

The CloudFront Function in `cloudfront.tf` serves the frozen `iteration-1` and `iteration-2` builds kept in the same bucket. A bare `/iteration-1` redirects to `/iteration-1/`, and any path under it without a file extension gets that build's `index.html`. The function and its Terraform address are still named `basic_auth` from when it also checked a shared password. Renaming it would replace the function, which fails while the distribution uses it, so leave the name until that is planned separately.

### SSM parameters

| Parameter | What it holds | How it gets there |
| --- | --- | --- |
| `/mypowerplant-production/database-url` | Neon connection string | Written once, by the first `terraform apply` with `TF_VAR_neon_database_url`. To change it later, see "Changing the Neon connection string". Terraform copies it into the Lambda's `DATABASE_URL` on every apply. |
| `/mypowerplant-production/llm-api-key` | Groq or Gemini key for "What if" phrasing | Terraform creates it with the value `unset`. You put the real key in with the AWS CLI. The Lambda reads it at runtime. |

Both parameters ignore value changes after they are created. That means CI can never overwrite them, and a value you set by hand stays put across deploys.

## What you need

- Terraform 1.10 or later. CI uses 1.16.0. Version 1.10 is the minimum because the state uses native S3 locking.
- AWS credentials that can create everything above. `aws sts get-caller-identity` should work.
- Docker, to build the backend image.

## State

State lives in the S3 bucket `mypowerplant-terraform-state-070165420787`, with native S3 locking and no DynamoDB table. The settings are in the `backend "s3"` block in `versions.tf`. CI and local runs share the same state.

That bucket is created by the separate config in `terraform/bootstrap/`, which has its own local state. It is kept apart so a `terraform destroy` here can never delete the bucket holding the state. You only run it once per AWS account:

```bash
cd terraform/bootstrap
terraform init
terraform apply
```

## Variables you must pass

| Variable | Notes |
| --- | --- |
| `lambda_image_tag` | Tag of an image already pushed to ECR. No default on purpose, so every apply says exactly which image it deploys. CI uses the full commit SHA. |
| `neon_database_url` | Neon connection string. No default. Only really written on the first apply, see the SSM section above. |

Pass secrets with environment variables, for example `TF_VAR_neon_database_url`, or a gitignored `secrets.auto.tfvars` file. Never put them in a `.tf` file.

## First deploy

The Lambda needs an image in ECR before it can be created, and Terraform does not build images. So the first time, the order matters.

```bash
cd terraform
terraform init

# 1. Create only the ECR repository
terraform apply -target=aws_ecr_repository.backend

# 2. Build and push the backend image, tagged with the current commit
REPO_URL=$(terraform output -raw ecr_repository_url)
TAG=$(git rev-parse HEAD)
aws ecr get-login-password --region ap-southeast-2 | docker login --username AWS --password-stdin "$REPO_URL"
docker buildx build --platform linux/arm64 --build-arg PLATFORM=linux/arm64 \
  --provenance=false --sbom=false \
  --tag "$REPO_URL:$TAG" --push ../backend

# 3. Apply everything else
TF_VAR_neon_database_url="postgresql+asyncpg://..." \
terraform apply -var="lambda_image_tag=$TAG"
```

A few notes on step 2:

- `--provenance=false --sbom=false` are needed. Lambda rejects images that carry the attestations Docker adds by default.
- Pass `--platform` and `--build-arg PLATFORM` together and keep them the same. `backend/Dockerfile` explains why. The Lambda is set to arm64 in `lambda.tf`, so the image must be arm64 too.

After the first deploy, CI handles new images. You do not need to repeat these steps.

## After the first deploy

These are done by hand, once.

1. Add the certificate validation records at the domain registrar. Get them with `terraform output acm_root_validation_record` and `terraform output acm_validation_record`. The root domain record must stay in place, or ACM cannot renew the certificate.
2. Point `mypowerplant.tech` at the CloudFront address (`terraform output cloudfront_domain_name`). A root domain cannot use a plain CNAME, so use an ALIAS or ANAME style record at the registrar.
3. Put the language model key into SSM:

   ```bash
   aws ssm put-parameter --name /mypowerplant-production/llm-api-key --type SecureString --value "YOUR_KEY" --overwrite
   ```

4. Set up GitHub for the deploy workflow, as described in the CI section below.
5. Upload the frozen `iteration-1` and `iteration-2` builds into those folders in the frontend bucket, if you need them.

## Changing the Neon connection string

Terraform ignores changes to this parameter's value after it is first created. That is what stops CI's placeholder from ever being written, but it also means passing a new `TF_VAR_neon_database_url` will not change it. To rotate it, update the parameter with the AWS CLI, then run an apply so Terraform copies the new value into the Lambda's `DATABASE_URL`:

```bash
aws ssm put-parameter --name /mypowerplant-production/database-url --type SecureString --value "postgresql+asyncpg://..." --overwrite
terraform apply -var="lambda_image_tag=CURRENT_LIVE_SHA"
```

The apply still asks for `neon_database_url`. Any value works here because it is ignored.

Because Terraform reads the value back from SSM at apply time, the Lambda keeps the old connection string until that apply runs.

## Deploying the frontend by hand

CI normally does this. If you need to do it yourself, run from the `terraform` folder:

```bash
BUCKET=$(terraform output -raw frontend_bucket_name)
VITE_API_BASE_URL="$(terraform output -raw api_gateway_endpoint)" npm --prefix ../frontend run build
aws s3 sync ../frontend/dist "s3://$BUCKET" --delete --exclude "iteration-1/*" --exclude "iteration-2/*"
aws cloudfront create-invalidation --distribution-id YOUR_DISTRIBUTION_ID --paths "/*"
```

Keep the two `--exclude` flags. Without them, `--delete` removes the frozen iteration builds.

## CI/CD

`.github/workflows/deploy.yml` runs on every push to `main`, and you can start it by hand from the Actions tab. Pushes to `development` do not deploy. Merging `development` into `main` is the moment a change goes live.

The workflow has two jobs:

- Frontend: builds with `VITE_API_BASE_URL` set, syncs to S3 while leaving the iteration folders alone, and clears the CloudFront cache.
- Backend: builds the arm64 image, tags it with the full commit SHA, pushes it to ECR, and runs `terraform apply` with that tag.

### How it signs in to AWS

It uses GitHub OIDC, set up in `oidc.tf`. Each run swaps a short lived GitHub token for temporary credentials on the `mypowerplant-production-github-actions` role. No AWS keys are stored in GitHub.

The role only trusts this repository on the `main` branch. The organisation has GitHub's "immutable IDs in the subject claim" setting turned on, so the trust policy matches on the organisation and repository IDs as well as the names. Those IDs are the `github_org_id` and `github_repo_id` variables in `variables.tf`. If the repository moves to a new organisation, update those values or CI will be refused.

### GitHub settings

Add these under Settings, Secrets and variables, Actions.

Variables:

| Name | Where to get it |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | `terraform output github_actions_role_arn` |
| `API_BASE_URL` | `terraform output api_gateway_endpoint` |
| `FRONTEND_BUCKET_NAME` | `terraform output frontend_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `aws cloudfront list-distributions`. There is no Terraform output for it. |
| `ECR_REPOSITORY_URL` | `terraform output ecr_repository_url` |

No secrets are needed.

### Image tags and rollback

Every deploy pushes an image tagged with the full commit SHA, never `latest`. Terraform only notices a new image when the tag changes, so reusing a tag would leave the Lambda running old code without any error.

ECR expires untagged images after 7 days and keeps only the 10 newest tagged images. To roll back, run `terraform apply` with an older SHA as `lambda_image_tag`, as long as it is one of the last 10.

If the Lambda ever seems to be running old code, compare its image tag with the latest commit SHA on `main`.

## Costs

At this project's traffic, almost everything is free or close to it. Two things are worth knowing:

- ECR storage. The backend image is about 975 MB, which is over the free 500 MB. Expect a few cents a month. The lifecycle rules stop it growing.
- API Gateway and S3 are free for the first 12 months on a new account, then billed. At this traffic that is cents a month.

CloudFront, Lambda and CloudWatch Logs, with the 14 day retention set here, stay within the always free limits.
