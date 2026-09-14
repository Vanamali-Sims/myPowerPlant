output "cloudfront_domain_name" {
  description = "CloudFront distribution's default domain. Stays live as a fallback alongside local.app_domain_name (see cloudfront.tf/lambda.tf) even after the custom domain alias is attached - CloudFront never disables it."
  value       = aws_cloudfront_distribution.frontend.domain_name
}

output "api_gateway_endpoint" {
  description = "HTTP API base URL. Set this as the frontend build's VITE_API_BASE_URL."
  value       = aws_apigatewayv2_api.backend.api_endpoint
}

output "ecr_repository_url" {
  description = "Push the backend image here, e.g.: docker push <this>:latest"
  value       = aws_ecr_repository.backend.repository_url
}

output "frontend_bucket_name" {
  description = "Sync the Vite build output here, e.g.: aws s3 sync frontend/dist s3://<this>"
  value       = aws_s3_bucket.frontend.bucket
}

output "ssm_database_url_parameter_name" {
  description = "SSM parameter path holding the Neon connection string (name only, not the value)."
  value       = aws_ssm_parameter.database_url.name
}

output "acm_validation_record" {
  description = "DNS validation CNAME for app_domain's ACM certificate. Add this at the registrar (Terraform cannot); the certificate will not move to Issued until it's live and has propagated."
  value = {
    name  = tolist(aws_acm_certificate.app_domain.domain_validation_options)[0].resource_record_name
    type  = tolist(aws_acm_certificate.app_domain.domain_validation_options)[0].resource_record_type
    value = tolist(aws_acm_certificate.app_domain.domain_validation_options)[0].resource_record_value
  }
}
