# Created explicitly, named to match what Lambda would auto-create, so it
# carries a retention policy -- Lambda's own auto-created log group defaults
# to "never expire", which would otherwise slowly eat into the 5GB Always
# Free CloudWatch Logs storage allowance.
resource "aws_cloudwatch_log_group" "backend" {
  name              = "/aws/lambda/${local.name_prefix}-backend"
  retention_in_days = var.log_retention_days
}

resource "aws_lambda_function" "backend" {
  function_name = "${local.name_prefix}-backend"
  role          = aws_iam_role.lambda_exec.arn

  package_type = "Image"
  image_uri    = "${aws_ecr_repository.backend.repository_url}:${var.lambda_image_tag}"

  # Matches backend/Dockerfile's pinned build platform (linux/arm64) -- the
  # two must agree or the function fails at runtime with an exec-format
  # error. arm64 is also cheaper per GB-second than x86_64.
  architectures = ["arm64"]

  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  environment {
    variables = {
      ENVIRONMENT = var.environment
      # Resolves the CloudFront ordering dependency by referencing the
      # distribution's own domain_name attribute directly, rather than a
      # value that has to be filled in by hand after the fact.
      CORS_ORIGINS = "https://${aws_cloudfront_distribution.frontend.domain_name}"
      # Sourced from SSM at apply time, never a literal string in this repo.
      DATABASE_URL = aws_ssm_parameter.database_url.value
    }
  }

  depends_on = [aws_cloudwatch_log_group.backend]
}
