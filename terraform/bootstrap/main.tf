# This is a separate, small Terraform config with its own local state,
# applied once by hand. It creates the S3 bucket that the main stack's
# state will live in. It cannot live inside the main stack itself: the
# bucket holding state cannot be created by the same apply that needs
# that bucket to exist first, and keeping it separate also means a
# terraform destroy on the main stack can never take the state bucket
# down with it.
#
# Usage:
#   cd terraform/bootstrap
#   terraform init
#   terraform apply
#   terraform output state_bucket_name

terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for the state bucket. Should match the main stack's region."
  type        = string
  default     = "ap-southeast-2"
}

variable "project_name" {
  description = "Short name used to name the state bucket."
  type        = string
  default     = "mypowerplant"
}

data "aws_caller_identity" "current" {}

# Bucket name includes the account id since S3 bucket names are globally
# unique across all AWS accounts, not just this one.
resource "aws_s3_bucket" "terraform_state" {
  bucket = "${var.project_name}-terraform-state-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_versioning" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Refuse any request that is not made over TLS, since state can contain
# sensitive values.
data "aws_iam_policy_document" "terraform_state" {
  statement {
    sid     = "DenyInsecureTransport"
    effect  = "Deny"
    actions = ["s3:*"]
    resources = [
      aws_s3_bucket.terraform_state.arn,
      "${aws_s3_bucket.terraform_state.arn}/*",
    ]

    principals {
      type        = "*"
      identifiers = ["*"]
    }

    condition {
      test     = "Bool"
      variable = "aws:SecureTransport"
      values   = ["false"]
    }
  }
}

resource "aws_s3_bucket_policy" "terraform_state" {
  bucket = aws_s3_bucket.terraform_state.id
  policy = data.aws_iam_policy_document.terraform_state.json
}

output "state_bucket_name" {
  description = "Name of the S3 bucket holding Terraform state. Use this as the bucket value in the main stack's backend s3 block, and in the CI role's permissions."
  value       = aws_s3_bucket.terraform_state.bucket
}

output "state_bucket_arn" {
  description = "ARN of the state bucket, for scoping the CI role's IAM permissions to it."
  value       = aws_s3_bucket.terraform_state.arn
}
