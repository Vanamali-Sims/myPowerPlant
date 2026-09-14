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
#
# Matched on sub, not repository/ref: this org has GitHub's "include
# immutable IDs in the OIDC subject claim" setting on, so sub arrives as
# repo:ORG@ORG_ID/REPO@REPO_ID:ref:refs/heads/main rather than the
# plain-name form the AWS docs show (confirmed via CloudTrail on a denied
# AssumeRoleWithWebIdentity call). repository/ref would be simpler and
# immune to that setting, but AWS's own policy validation for this
# provider rejects any trust policy that doesn't condition on a
# non-wildcard sub or job_workflow_ref, so one of those has to be here
# regardless. sub is used alone, without also matching repository/ref:
# ANDing them back in would silently re-break trust on a repo or org
# rename, since the ID-based sub survives a rename but a name-based
# condition would not.
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
      variable = "token.actions.githubusercontent.com:sub"
      values   = ["repo:${var.github_org}@${var.github_org_id}/${var.github_repo}@${var.github_repo_id}:ref:refs/heads/main"]
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
      "ecr:ListTagsForResource",
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
#
# GetBucketAcl, GetBucketTagging, GetBucketPublicAccessBlock, and
# GetEncryptionConfiguration are all here so Terraform can refresh
# aws_s3_bucket.frontend, aws_s3_bucket_public_access_block.frontend, and
# aws_s3_bucket_server_side_encryption_configuration.frontend, which this
# config also manages, not because the deploy step syncing objects needs
# any of them.
data "aws_iam_policy_document" "github_actions_s3_frontend" {
  statement {
    sid    = "FrontendBucketList"
    effect = "Allow"
    actions = [
      "s3:ListBucket",
      "s3:GetBucketPolicy",
      "s3:GetBucketAcl",
      "s3:GetBucketTagging",
      "s3:GetBucketPublicAccessBlock",
      "s3:GetEncryptionConfiguration",
      "s3:GetBucketLocation",
      # The rest of these are legacy aws_s3_bucket attributes (cors_rule,
      # website, logging, replication_configuration,
      # object_lock_configuration, request_payer, acceleration_status,
      # versioning) that provider v5 still reads on every refresh even
      # though none of them are set on this bucket and none are managed
      # by this config. GetBucketCors turned up denied one at a time
      # after the actions above were already granted, rather than
      # alongside them, so the rest are added together here instead of
      # waiting for each to fail on its own run.
      "s3:GetBucketCORS",
      "s3:GetBucketWebsite",
      "s3:GetBucketLogging",
      "s3:GetReplicationConfiguration",
      "s3:GetBucketObjectLockConfiguration",
      "s3:GetBucketRequestPayment",
      "s3:GetAccelerateConfiguration",
      "s3:GetBucketVersioning",
      "s3:GetLifecycleConfiguration",
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
      "cloudfront:ListTagsForResource",
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

  # Full CRUD for the CloudFront Function this config manages, scoped to
  # that one function. DescribeFunction and GetFunction are both needed:
  # the former for refresh (metadata/status), the latter for the
  # function's code itself.
  statement {
    sid    = "CloudFrontFunctionManage"
    effect = "Allow"
    actions = [
      "cloudfront:CreateFunction",
      "cloudfront:DescribeFunction",
      "cloudfront:GetFunction",
      "cloudfront:UpdateFunction",
      "cloudfront:PublishFunction",
      "cloudfront:DeleteFunction",
    ]
    resources = [aws_cloudfront_function.basic_auth.arn]
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
      "lambda:ListVersionsByFunction",
      # These four are optional sub-configs (none are set on this
      # function), but same as the S3 legacy attributes elsewhere in
      # this file, provider v5 still reads them unconditionally on
      # every refresh.
      "lambda:GetFunctionEventInvokeConfig",
      "lambda:GetFunctionUrlConfig",
      "lambda:GetFunctionCodeSigningConfig",
      "lambda:GetRuntimeManagementConfig",
    ]
    resources = [aws_lambda_function.backend.arn]
  }

  statement {
    sid    = "LambdaLogGroup"
    effect = "Allow"
    actions = [
      "logs:PutRetentionPolicy",
      "logs:TagResource",
      "logs:ListTagsForResource",
    ]
    resources = [aws_cloudwatch_log_group.backend.arn]
  }

  # DescribeLogGroups has no resource-level permission support (like
  # ecr:GetAuthorizationToken above), so it can only be granted on "*"
  # even though it is only ever used here to refresh one log group.
  statement {
    sid       = "LambdaLogGroupDescribe"
    effect    = "Allow"
    actions   = ["logs:DescribeLogGroups"]
    resources = ["*"]
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
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListRoleTags",
    ]
    resources = [aws_iam_role.lambda_exec.arn]
  }

  # This config manages 8 inline policies on the github_actions role
  # itself (all the aws_iam_role_policy.github_actions_* resources,
  # including this one), so the role needs the same self-read access
  # granted above for lambda_exec, just pointed at itself. Without this,
  # Terraform can authenticate as this role but cannot refresh the role
  # or any of its own inline policies.
  statement {
    sid    = "ReadSelfRole"
    effect = "Allow"
    actions = [
      "iam:GetRole",
      "iam:GetRolePolicy",
      "iam:ListRolePolicies",
      "iam:ListAttachedRolePolicies",
      "iam:ListRoleTags",
    ]
    resources = [aws_iam_role.github_actions.arn]
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

  # The OIDC provider itself is a resource this config manages, so
  # Terraform reads it back on every refresh like any other.
  statement {
    sid    = "ReadOidcProvider"
    effect = "Allow"
    actions = [
      "iam:GetOpenIDConnectProvider",
      "iam:ListOpenIDConnectProviderTags",
    ]
    resources = [aws_iam_openid_connect_provider.github_actions.arn]
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
    sid    = "ReadDatabaseUrlParameter"
    effect = "Allow"
    actions = [
      "ssm:GetParameter",
      "ssm:ListTagsForResource",
    ]
    resources = [aws_ssm_parameter.database_url.arn]
  }

  # DescribeParameters has no resource-level permission support (like
  # ecr:GetAuthorizationToken above), so it can only be granted on "*"
  # even though it is only ever used here to refresh one parameter.
  statement {
    sid       = "DescribeDatabaseUrlParameter"
    effect    = "Allow"
    actions   = ["ssm:DescribeParameters"]
    resources = ["*"]
  }
}

# Full CRUD for the ACM certificate in acm.tf, scoped to that one
# certificate. Note this is an IAM policy, not tied to any region - the
# certificate itself lives in us-east-1 (see the aws.us_east_1 provider
# alias in versions.tf and acm.tf), but this role's permissions apply
# wherever its ARN is referenced, including from a plan/apply that
# otherwise runs in var.aws_region. ListTagsForCertificate/
# AddTagsToCertificate are here for the same default_tags reason as
# every other resource's tag actions elsewhere in this file.
data "aws_iam_policy_document" "github_actions_acm" {
  statement {
    sid    = "AcmCertificateManage"
    effect = "Allow"
    actions = [
      "acm:RequestCertificate",
      "acm:DescribeCertificate",
      "acm:DeleteCertificate",
      "acm:AddTagsToCertificate",
      "acm:RemoveTagsFromCertificate",
      "acm:ListTagsForCertificate",
    ]
    resources = [aws_acm_certificate.app_domain.arn]
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

resource "aws_iam_role_policy" "github_actions_acm" {
  name   = "${local.name_prefix}-github-actions-acm"
  role   = aws_iam_role.github_actions.id
  policy = data.aws_iam_policy_document.github_actions_acm.json
}

output "github_actions_role_arn" {
  description = "Role ARN GitHub Actions assumes via OIDC. Set this as the AWS_DEPLOY_ROLE_ARN repository variable."
  value       = aws_iam_role.github_actions.arn
}
