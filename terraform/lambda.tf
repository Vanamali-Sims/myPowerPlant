# Created explicitly, named to match what Lambda would auto-create, so it
# carries a retention policy. Lambda's own auto-created log group defaults
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

  # Matches backend/Dockerfile's pinned build platform (linux/arm64). The
  # two must agree or the function fails at runtime with an exec-format
  # error. arm64 is also cheaper per GB-second than x86_64.
  architectures = ["arm64"]

  memory_size = var.lambda_memory_size
  timeout     = var.lambda_timeout

  environment {
    variables = {
      ENVIRONMENT = var.environment
      # domain_name always returns the original *.cloudfront.net address,
      # even once an alias (var.root_domain) is attached - CloudFront
      # never disables or replaces it, adding an alias only adds another
      # way to reach the same distribution. So both stay permanently live
      # regardless of what's allowed here, and both are allowed: there is
      # no access-control reason to drop the cloudfront.net origin (both
      # serve the same public site, since the CloudFront Function in
      # cloudfront.tf is attached to the distribution's behavior, not to a
      # specific domain), and keeping it gives a working fallback
      # if the custom domain's DNS ever has an outage or a propagation
      # delay, without an emergency apply just to restore API access.
      CORS_ORIGINS = join(",", [
        "https://${aws_cloudfront_distribution.frontend.domain_name}",
        "https://${var.root_domain}",
      ])
      # Sourced from SSM at apply time, never a literal string in this repo.
      DATABASE_URL = aws_ssm_parameter.database_url.value
      # Name only. The key itself is read from SSM at runtime so a console
      # update is not wiped by the next deploy.
      LLM_PROVIDER     = var.llm_provider
      LLM_API_KEY_PARAM = aws_ssm_parameter.llm_api_key.name
    }
  }

  depends_on = [aws_cloudwatch_log_group.backend]
}
