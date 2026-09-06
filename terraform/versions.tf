terraform {
  required_version = ">= 1.10.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  # Remote state in S3, with native S3 locking (use_lockfile) rather than
  # the older DynamoDB lock table pattern. Native locking was added in
  # Terraform 1.10 and needs no separate table, IAM permissions for it, or
  # cost to maintain. This is why required_version above is 1.10 and not
  # just the 1.7 this config used to need.
  #
  # The bucket itself is created once, by hand, from terraform/bootstrap
  # (see that directory for why it is not managed by this same stack).
  # This block works the same way for CI and for manual local applies:
  # anyone with AWS credentials and this file can run terraform init here
  # and get the same shared state and locking.
  backend "s3" {
    bucket       = "mypowerplant-terraform-state-070165420787"
    key          = "mypowerplant/terraform.tfstate"
    region       = "ap-southeast-2"
    encrypt      = true
    use_lockfile = true
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = local.common_tags
  }
}
