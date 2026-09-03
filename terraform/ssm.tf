# SSM Parameter Store (SecureString), not Secrets Manager: same effect --
# encrypted, IAM-scoped, referenced by Lambda config rather than hardcoded --
# at $0 rather than Secrets Manager's ~$0.40/secret/month, which isn't part
# of any AWS free tier and isn't justified here since rotation isn't in use.
resource "aws_ssm_parameter" "database_url" {
  name        = "/${local.name_prefix}/database-url"
  description = "Neon Postgres connection string, consumed by the backend Lambda's DATABASE_URL env var."
  type        = "SecureString"
  value       = var.neon_database_url
}
