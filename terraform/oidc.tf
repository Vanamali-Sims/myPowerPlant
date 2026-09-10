# OIDC federation between GitHub Actions and AWS. The pipeline authenticates
# by exchanging a short lived GitHub-issued token for temporary AWS
# credentials, so no long lived access key needs to be stored as a GitHub
# secret.
#
# The thumbprint below is GitHub's documented value for this provider.
# AWS no longer actually validates it for GitHub's and a small set of other
# well known providers (it verifies the certificate chain itself), but the
# field is still required by the resource schema, so the documented value
# is used rather than a placeholder.
resource "aws_iam_openid_connect_provider" "github_actions" {
  url             = "https://token.actions.githubusercontent.com"
  client_id_list  = ["sts.amazonaws.com"]
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

# Trust policy scoped to this exact repository and to the main branch only.
# Matched on the repository and ref claims rather than sub: this org has
# GitHub's "include immutable IDs in the OIDC subject claim" setting on, so
# sub actually arrives as repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/heads/main
# instead of the plain-name form the AWS docs show. repository and ref are
# separate claims GitHub always issues in plain-name form regardless of
# that setting, so matching on those avoids depending on numeric IDs that
# would silently break trust again if the setting or the IDs ever change.
data "aws_iam_policy_document" "github_actions_trust" {
  statement {
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github_actions.arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:repository"
      values   = ["${var.github_org}/${var.github_repo}"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:ref"
      values   = ["refs/heads/main"]
    }
  }
}

resource "aws_iam_role" "github_actions" {
  name               = "${local.name_prefix}-github-actions"
  assume_role_policy = data.aws_iam_policy_document.github_actions_trust.json
}

# ARN of the state bucket created in terraform/bootstrap. Built from the
# literal name rather than a resource reference, since that bucket lives
# in a separate state on purpose (see terraform/bootstrap/main.tf). Must
# match the bucket value in this file's own backend "s3" block.
locals {
  state_bucket_arn = "arn:aws:s3:::mypowerplant-terraform-state-070165420787"
}

# Read and write the Terraform state object itself, plus the lock file
# that native S3 locking creates alongside it during apply.
data "aws_iam_policy_document" "github_actions_state" {
  statement {
    sid    = "StateBucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [local.state_bucket_arn]
  }

  statement {
    sid    = "StateObjectReadWrite"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${local.state_bucket_arn}/mypowerplant/*"]
  }
}

# Build and push the backend image. GetAuthorizationToken has no
# resource-level support in ECR and must be granted on "*", this is an AWS
# requirement, not a broadening of scope beyond what is needed.
data "aws_iam_policy_document" "github_actions_ecr" {
  statement {
    sid       = "EcrAuth"
    effect    = "Allow"
    actions   = ["ecr:GetAuthorizationToken"]
    resources = ["*"]
  }

  statement {
    sid    = "EcrPushPull"
    effect = "Allow"
    actions = [
      "ecr:BatchCheckLayerAvailability",
      "ecr:GetDownloadUrlForLayer",
      "ecr:BatchGetImage",
      "ecr:InitiateLayerUpload",
      "ecr:UploadLayerPart",
      "ecr:CompleteLayerUpload",
      "ecr:PutImage",
      "ecr:DescribeRepositories",
      "ecr:DescribeImages",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }

  # Needed because Terraform manages the repository's lifecycle policy
  # (the untagged-image rule and the tagged-image retention rule added
  # alongside it).
  statement {
    sid    = "EcrLifecyclePolicy"
    effect = "Allow"
    actions = [
      "ecr:GetLifecyclePolicy",
      "ecr:PutLifecyclePolicy",
    ]
    resources = [aws_ecr_repository.backend.arn]
  }
}

# Sync the frontend build to its bucket and read/write the state bucket's
# own settings are covered above; this is only the frontend bucket.
data "aws_iam_policy_document" "github_actions_s3_frontend" {
  statement {
    sid    = "FrontendBucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
    ]
    resources = [aws_s3_bucket.frontend.arn]
  }

  statement {
    sid    = "FrontendObjectReadWriteDelete"
    effect = "Allow"
    actions = [
      "s3:GetObject",
      "s3:PutObject",
      "s3:DeleteObject",
    ]
    resources = ["${aws_s3_bucket.frontend.arn}/*"]
  }
}

# CloudFront invalidation for the deploy step, plus the management actions
# Terraform needs to keep the distribution, its origin access control, and
# its response headers policy in sync with this config. Most CloudFront
# write actions do not support resource-level ARNs, so those are granted
# on "*"; this is a CloudFront API limitation, not a broadening of scope.
data "aws_iam_policy_document" "github_actions_cloudfront" {
  statement {
    sid    = "CloudFrontInvalidate"
    effect = "Allow"
    actions = [
      "cloudfront:CreateInvalidation",
      "cloudfront:GetInvalidation",
      "cloudfront:ListInvalidations",
    ]
    resources = [aws_cloudfront_distribution.frontend.arn]
  }

  statement {
    sid    = "CloudFrontManage"
    effect = "Allow"
    actions = [
      "cloudfront:GetDistribution",
      "cloudfront:GetDistributionConfig",
      "cloudfront:UpdateDistribution",
      "cloudfront:TagResource",
      "cloudfront:GetOriginAccessControl",
      "cloudfront:GetOriginAccessControlConfig",
      "cloudfront:CreateOriginAccessControl",
      "cloudfront:UpdateOriginAccessControl",
      "cloudfront:DeleteOriginAccessControl",
      "cloudfront:GetResponseHeadersPolicy",
      "cloudfront:GetResponseHeadersPolicyConfig",
      "cloudfront:CreateResponseHeadersPolicy",
      "cloudfront:UpdateResponseHeadersPolicy",
      "cloudfront:DeleteResponseHeadersPolicy",
    ]
    resources = ["*"]
  }
}

# Update the Lambda function to the new image and keep its configuration
# and log group in sync with this config.
data "aws_iam_policy_document" "github_actions_lambda" {
  statement {
    sid    = "LambdaManage"
    effect = "Allow"
    actions = [
      "lambda:GetFunction",
      "lambda:GetFunctionConfiguration",
      "lambda:UpdateFunctionCode",
      "lambda:UpdateFunctionConfiguration",
      "lambda:TagResource",
      "lambda:ListTags",
      "lambda:GetPolicy",
      "lambda:AddPermission",
      "lambda:RemovePermission",
    ]
    resources = [aws_lambda_function.backend.arn]
  }

  statement {
    sid    = "LambdaLogGroup"
    effect = "Allow"
    actions = [
      "logs:DescribeLogGroups",
      "logs:PutRetentionPolicy",
      "logs:TagResource",
    ]
    resources = [aws_cloudwatch_log_group.backend.arn]
  }
}

# Read the lambda_exec role Terraform already manages, and pass it to
# Lambda when updating the function configuration. Scoped to that one role
# and to the Lambda service as the only allowed recipient of PassRole.
data "aws_iam_policy_document" "github_actions_iam" {
  statement {
    sid    = "ReadLambdaExecRole"
    effect = "Allow"
    actions = [
      "iam:GetRole",
      "iam:GetRolePolicy",
    ]
    resources = [aws_iam_role.lambda_exec.arn]
  }

  statement {
    sid       = "PassLambdaExecRole"
    effect    = "Allow"
    actions   = ["iam:PassRole"]
    resources = [aws_iam_role.lambda_exec.arn]

    condition {
      test     = "StringEquals"
      variable = "iam:PassedToService"
      values   = ["lambda.amazonaws.com"]
    }
  }
}

# Terraform reads the API Gateway resources on every plan even when
# nothing changes. Resource-level ARNs for the HTTP API management plane
# only go down to the API id, not further, and creation actions cannot be
# scoped to an id that does not exist yet, so this is scoped to the region
# rather than to a specific api id.
data "aws_iam_policy_document" "github_actions_apigateway" {
  statement {
    sid    = "ApiGatewayManage"
    effect = "Allow"
    actions = [
      "apigateway:GET",
      "apigateway:POST",
      "apigateway:PATCH",
      "apigateway:DELETE",
    ]
    resources = ["arn:aws:apigateway:${var.aws_region}::/apis/*"]
  }
}

# Read the SSM parameter during plan/refresh. The lifecycle ignore_changes
# on its value (see terraform/ssm.tf) means CI never needs write access to
# it, only enough to read it back for the plan to complete.
data "aws_iam_policy_document" "github_actions_ssm" {
  statement {
    sid       = "ReadDatabaseUrlParameter"
    effect    = "Allow"
    actions   = ["ssm:GetParameter"]
    resources = [aws_ssm_parameter.database_url.arn]
  }
}

resource "aws_iam_role_policy" "github_actions_state" {
  name   = "${local.name_prefix}-github-actions-state"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_state.json
}

resource "aws_iam_role_policy" "github_actions_ecr" {
  name   = "${local.name_prefix}-github-actions-ecr"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_ecr.json
}

resource "aws_iam_role_policy" "github_actions_s3_frontend" {
  name   = "${local.name_prefix}-github-actions-s3-frontend"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_s3_frontend.json
}

resource "aws_iam_role_policy" "github_actions_cloudfront" {
  name   = "${local.name_prefix}-github-actions-cloudfront"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_cloudfront.json
}

resource "aws_iam_role_policy" "github_actions_lambda" {
  name   = "${local.name_prefix}-github-actions-lambda"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_lambda.json
}

resource "aws_iam_role_policy" "github_actions_iam" {
  name   = "${local.name_prefix}-github-actions-iam"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_iam.json
}

resource "aws_iam_role_policy" "github_actions_apigateway" {
  name   = "${local.name_prefix}-github-actions-apigateway"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_apigateway.json
}

resource "aws_iam_role_policy" "github_actions_ssm" {
  name   = "${local.name_prefix}-github-actions-ssm"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_ssm.json
}

output "github_actions_role_arn" {
  description = "Role ARN GitHub Actions assumes via OIDC. Set this as the AWS_DEPLOY_ROLE_ARN repository variable."
  value       = aws_iam_role.github_actions.arn
}
