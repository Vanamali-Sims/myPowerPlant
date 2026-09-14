locals {
  name_prefix = "${var.project_name}-${var.environment}"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }

  s3_origin_id = "${local.name_prefix}-frontend"

  app_domain_name = "app.${var.root_domain}"
}
