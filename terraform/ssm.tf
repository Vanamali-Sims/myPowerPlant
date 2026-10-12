# SSM Parameter Store (SecureString), not Secrets Manager, for the same
# effect: encrypted, IAM-scoped, referenced by Lambda config rather than
# hardcoded, at $0 rather than Secrets Manager's ~$0.40/secret/month, which
# isn't part of any AWS free tier and isn't justified here since rotation
# isn't in use.
resource "aws_ssm_parameter" "database_url" {
  name        = "/${local.name_prefix}/database-url"
  description = "Neon Postgres connection string, consumed by the backend Lambda's DATABASE_URL env var."
  type        = "SecureString"
  value       = var.neon_database_url

  # CI applies pass a placeholder for neon_database_url since it has no
  # default and Terraform requires some value to evaluate a plan, but CI
  # should never be the thing that sets or rotates the real connection
  # string. Ignoring changes to value means the placeholder is accepted at
  # plan time and then never actually written to this parameter. Setting
  # or rotating the real value stays a deliberate manual apply from a
  # local machine, per the README.
  lifecycle {
    ignore_changes = [value]
  }
}

# Created as "unset". A later `aws ssm put-parameter --overwrite` sticks,
# because CI applies ignore this value. The Lambda reads it at runtime.
resource "aws_ssm_parameter" "llm_api_key" {
  name        = "/${local.name_prefix}/llm-api-key"
  description = "Groq or Gemini key for What if phrasing. Leave unset to keep the fixed sentence."
  type        = "SecureString"
  value       = "unset"

  lifecycle {
    ignore_changes = [value]
  }
}
