# MyPowerPlant

MyPowerPlant helps a household that has solar panels and a battery understand its energy use and work out whether a Virtual Power Plant (VPP) plan is worth it. People fill in a short profile, see estimated consumption, savings and carbon on a dashboard, compare VPP plans, and try "What if" changes, goals and reminders.

Most of the work happens in the browser. The household profile is saved in the browser's localStorage and never sent to the server to be stored. The backend is small and stateless. It serves read-only reference data (rates, appliances, VPP plans and so on) and can optionally ask a language model to phrase a "What if" comparison in plain English.

## Folder layout

| Folder | What lives there |
| --- | --- |
| `frontend/` | React 19 and TypeScript app built with Vite. All the modelling and KPI maths live here. |
| `backend/` | FastAPI app in `app/`, Alembic migrations in `alembic/`, tests in `tests/`, the Dockerfile for the Lambda image, and `docker-compose.yml` for a local Postgres. |
| `terraform/` | AWS infrastructure. `terraform/bootstrap/` is a separate small config for the Terraform state bucket. See `terraform/README.md` for the full deploy guide. |
| `.github/workflows/` | `security.yml` runs the tests and security checks. `deploy.yml` deploys to AWS. |
| `docs/` | Notes on the KPI formulas and the user flows. |

The backend has three routes, all under `/api`:

| Route | What it does |
| --- | --- |
| `GET /api/health` | Health check. |
| `GET /api/methodology` | Reference data the frontend uses for its calculations. |
| `POST /api/advice` | Phrases a "What if" comparison using Groq or Gemini. Falls back to a fixed sentence if no key is set. Stores nothing. |

The same FastAPI `app` object in `backend/app/main.py` runs locally under uvicorn and in AWS Lambda through Mangum (`app.main.handler`).

## What you need

- Python 3.13. CI uses 3.13. Python 3.12 has also worked for local runs.
- Node.js 20.19 or later, or 22.12 or later, with npm. CI uses Node 22.
- Docker, for the local Postgres 16 database.
- Terraform 1.10 or later, only if you work on infrastructure. CI uses 1.16.0.

## Environment files

Each app has an example file. Copy it to `.env` in the same folder and fill it in. The `.env` files are gitignored, so never commit them.

Backend, from `backend/.env.example`:

| Variable | What it is for |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. The example points at the local Docker database. |
| `ENVIRONMENT` | `local` by default. Set to `production` on Lambda, which makes `CORS_ORIGINS` required and turns off the relaxed local origin matching. |
| `CORS_ORIGINS` | Comma separated list of browser origins allowed to call the API. |
| `LLM_PROVIDER` | `groq` or `gemini`. |
| `LLM_API_KEY` | Key for that provider. Leave it blank and the app uses its fixed sentence instead. |
| `LLM_MODEL` | Leave blank to use the default model for the provider. |

Frontend, from `frontend/.env.example`:

| Variable | What it is for |
| --- | --- |
| `VITE_API_BASE_URL` | Base URL of the backend, with no trailing slash. Locally this is `http://localhost:8000`. |

## Running it locally

Use three terminals. Start the database first, because the backend will not start without it.

### 1. Database

```bash
cd backend
docker compose up -d
cp .env.example .env
```

On Windows use `copy .env.example .env`.

### 2. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

On Windows activate the virtual environment with `.venv\Scripts\activate`.

The API runs on `http://localhost:8000`. You can browse the interactive API docs at `http://localhost:8000/docs`.

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Open `http://localhost:5173`.

## Database migrations

Alembic reads the same `DATABASE_URL` as the app.

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "describe the change"
```

A quick guide to the existing migrations:

- 003, 004 and 006 create and seed the reference data, such as methodology values, appliances and VPP plans and terms.
- 005 dropped the old tables that held household data. The server no longer stores anything about users.

Changes to migrations 003, 006 or any migration with `vpp` in its name need a review from both people listed in `.github/CODEOWNERS`.

## Tests and security checks

These are the same steps CI runs in `.github/workflows/security.yml`. If they pass locally they should pass in CI.

Frontend type check, lint, audit and unit tests:

```bash
cd frontend
npm ci
npm audit --audit-level=high
npx tsc -b
npm run lint
npm test
```

Backend dependency audit:

```bash
cd backend
pip install -r requirements.txt pip-audit
pip-audit --strict
```

Backend tests. These use a throwaway SQLite database, so you do not need Postgres running:

```bash
cd backend
pip install -r requirements-dev.txt
pytest tests/ -v
```

Secret scan across the full git history. CI uses gitleaks 8.28.0:

```bash
gitleaks detect --source . --redact --verbose --exit-code 1
```

## Branching and releases

| Branch | Purpose | Deploys? |
| --- | --- | --- |
| `feat/...` or `fix/...` | Day to day work on one change. | No |
| `development` | Where finished work is merged and checked together. | No |
| `main` | What is live. | Yes, on every push |

The flow:

1. Branch off `development` for your change.
2. Open a pull request into `development`. The security workflow runs on every pull request.
3. When `development` is ready to go live, merge it into `main`.
4. That push to `main` starts the deploy workflow, which deploys both the frontend and the backend.

## CI/CD

| Workflow | When it runs | What it does |
| --- | --- | --- |
| `security.yml` | Push to `main`, `development` or `sec`, every pull request, and weekly on Monday at 19:00 UTC | Gitleaks secret scan, npm audit with type check, lint and unit tests, pip-audit, and the backend pytest suite. Fails on high severity findings. |
| `deploy.yml` | Push to `main`, or started by hand from the Actions tab | Builds the frontend and syncs it to S3, then clears the CloudFront cache. Builds the backend Docker image for arm64, tags it with the full commit SHA, pushes it to ECR, and runs `terraform apply` with that tag. |

The deploy workflow needs these settings in GitHub under Settings, Secrets and variables, Actions.

Repository variables:

| Name | Where the value comes from |
| --- | --- |
| `AWS_DEPLOY_ROLE_ARN` | Terraform output `github_actions_role_arn` |
| `API_BASE_URL` | Terraform output `api_gateway_endpoint` |
| `FRONTEND_BUCKET_NAME` | Terraform output `frontend_bucket_name` |
| `CLOUDFRONT_DISTRIBUTION_ID` | `aws cloudfront list-distributions` |
| `ECR_REPOSITORY_URL` | Terraform output `ecr_repository_url` |

Repository secret:

| Name | Notes |
| --- | --- |
| `BASIC_AUTH_PASSWORD` | Shared password for the site. Set this before the deploy ever runs. If it is missing, Terraform deploys a password check that rejects everyone, even with the right password. |

How CI signs in to AWS: it uses GitHub OIDC, set up in `terraform/oidc.tf`. Each run swaps a short lived GitHub token for temporary AWS credentials on the `mypowerplant-production-github-actions` role. That role only trusts this repository and only the `main` branch. No AWS access keys are stored in GitHub.

Rolling back: run `terraform apply` with an older commit SHA as `lambda_image_tag`. ECR keeps the 10 most recent tagged images, so you can only go back that far.

## AWS and Terraform

Everything runs in `ap-southeast-2`, apart from the CloudFront certificates, which AWS requires to live in `us-east-1`. Resource names start with `mypowerplant-production`.

What Terraform manages:

- A private S3 bucket for the frontend build, readable only by CloudFront.
- A CloudFront distribution serving `mypowerplant.tech`, with a security headers policy and a small CloudFront Function. The function asks for a shared password before showing the site and also serves the frozen `iteration-1` and `iteration-2` builds.
- ACM certificates for `mypowerplant.tech` and `app.mypowerplant.tech`. Only the root domain certificate is attached to CloudFront now.
- An ECR repository for the backend image, with rules that expire untagged images after 7 days and keep only the 10 newest tagged images.
- The backend Lambda function, running the container image on arm64, plus its CloudWatch log group with 14 days of retention.
- An HTTP API Gateway that sends every request to the Lambda, throttled to 10 requests per second with a burst of 40.
- IAM roles for the Lambda and for GitHub Actions, and the GitHub OIDC provider.
- Two SSM parameters, listed below.

The database is Neon Postgres, which sits outside AWS. There is no RDS, Aurora or VPC.

Terraform state is kept in S3 with native locking. The state bucket is created once, by hand, from `terraform/bootstrap/`.

SSM parameters the backend uses (names only):

| Parameter | Used for |
| --- | --- |
| `/mypowerplant-production/database-url` | Neon connection string. Terraform copies it into the Lambda's `DATABASE_URL` when it applies. |
| `/mypowerplant-production/llm-api-key` | Groq or Gemini key for the "What if" phrasing. The Lambda reads it at runtime using the parameter name in `LLM_API_KEY_PARAM`. |

Things you have to do by hand:

- Apply `terraform/bootstrap` once to create the state bucket.
- On the very first deploy, create the ECR repository on its own, push an image, then apply everything else. `terraform/README.md` walks through this.
- Set the Neon connection string on the first apply with `TF_VAR_neon_database_url`. After that, Terraform ignores changes to it, so to rotate it you update the SSM parameter with the AWS CLI and then run an apply. `terraform/README.md` has the steps. CI only passes a placeholder and never overwrites it.
- Put the language model key into SSM yourself. Terraform creates the parameter with the value `unset` and then ignores later changes, so your value survives future deploys:

  ```bash
  aws ssm put-parameter --name /mypowerplant-production/llm-api-key --type SecureString --value "YOUR_KEY" --overwrite
  ```

- Add the GitHub variables and the `BASIC_AUTH_PASSWORD` secret listed above.
- Add the certificate validation records (Terraform outputs `acm_validation_record` and `acm_root_validation_record`) and the root domain ALIAS record at the domain registrar.
- Upload the frozen `iteration-1` and `iteration-2` builds to the frontend bucket. The deploy workflow leaves those folders alone.

## Project documentation

- `docs/kpi-card-formulas.md` explains how each dashboard number is calculated and where the figures come from.
- `docs/user-flows-matt-rain.md` describes the two user journeys, the screens, an acceptance checklist and some open questions.
