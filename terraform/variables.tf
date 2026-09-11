variable "aws_region" {
  description = "AWS region for all resources."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Short name used to prefix and tag every resource."
  type        = string
  default     = "mypowerplant"
}

variable "environment" {
  description = "Deployment environment name, also set as the backend's ENVIRONMENT env var."
  type        = string
  default     = "production"
}

variable "lambda_image_tag" {
  description = <<-EOT
    Tag of the backend image already pushed to the ECR repository this config
    creates. The image must exist in ECR before the Lambda function can be
    created or updated with it. Terraform does not build or push images.
    First-time deploy: apply the ECR repository alone, docker build/push to
    it, then apply everything else with the tag you pushed.

    No default on purpose. Terraform detects a Lambda update by comparing
    this string, so a bare apply that silently fell back to some default
    tag could roll the function back to whatever that tag currently points
    to in ECR, which will drift out of date the moment a newer image is
    pushed under a different tag. Every apply, local or CI, must state the
    tag it actually intends to deploy.
  EOT
  type        = string
}

variable "lambda_memory_size" {
  description = "Lambda memory in MB. Also determines allotted vCPU."
  type        = number
  default     = 512
}

variable "lambda_timeout" {
  description = "Lambda timeout in seconds."
  type        = number
  default     = 15
}

variable "log_retention_days" {
  description = "CloudWatch Logs retention for the Lambda function's log group."
  type        = number
  default     = 14
}

variable "cloudfront_price_class" {
  description = <<-EOT
    CloudFront edge location coverage. Does not affect cost within the
    Always Free 1 TB/month data-transfer allowance. It only changes which
    edge locations serve requests. PriceClass_100 excludes Asia
    Pacific/Australia entirely, which would be a poor default for an
    Australia-facing app; PriceClass_All is used here so local users get a
    nearby edge.
  EOT
  type        = string
  default     = "PriceClass_All"
}

variable "neon_database_url" {
  description = <<-EOT
    Full Neon Postgres connection string (postgresql+asyncpg://... including
    credentials). Stored in SSM Parameter Store, never written to a .tf file
    or committed. Supply it at apply time only, e.g.:
      TF_VAR_neon_database_url="postgresql+asyncpg://..." terraform apply
    or via a gitignored *.auto.tfvars file.
  EOT
  type        = string
  sensitive   = true
}

variable "api_throttling_rate_limit" {
  description = "API Gateway steady-state requests per second (R13 denial-of-wallet cap)."
  type        = number
  default     = 10
}

variable "api_throttling_burst_limit" {
  description = "API Gateway token-bucket burst above the steady-state rate."
  type        = number
  default     = 40
}

variable "github_org" {
  description = "GitHub organization or user that owns the repository. Used to scope the OIDC trust policy so only this repository can assume the CI role."
  type        = string
  default     = "Vanamali-Sims"
}

variable "github_repo" {
  description = "GitHub repository name. Used to scope the OIDC trust policy so only this repository can assume the CI role."
  type        = string
  default     = "myPowerPlant"
}

variable "github_org_id" {
  description = "Numeric GitHub organization ID. This org has GitHub's immutable-ID subject claim setting enabled, so the OIDC sub claim embeds this alongside github_org rather than the org name alone; see oidc.tf. Found via CloudTrail on a denied AssumeRoleWithWebIdentity call, not exposed anywhere in the GitHub UI."
  type        = string
  default     = "117826689"
}

variable "github_repo_id" {
  description = "Numeric GitHub repository ID, embedded in the OIDC sub claim alongside github_repo for the same reason as github_org_id."
  type        = string
  default     = "1351386984"
}
