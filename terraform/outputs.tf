output "cloudfront_domain_name" {
  description = "CloudFront distribution domain. Set as the frontend's public URL and as the source of CORS_ORIGINS."
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
