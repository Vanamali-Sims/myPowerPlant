resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}


resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  comment             = "${local.name_prefix} frontend"

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.frontend.id
  }

  default_cache_behavior {
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = local.s3_origin_id
    viewer_protocol_policy = "redirect-to-https"
    compress               = true

    # AWS managed "CachingOptimized" policy, hardcoded rather than looked up
    # via a data source: it's a stable, AWS-documented constant that never
    # changes (see "CachingOptimized" at
    # https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/using-managed-cache-policies.html),
    # and the lookup itself requires cloudfront:ListCachePolicies, which
    # this account's IAM user doesn't have.
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }

  # No router is in use in the current frontend (it's a client-side view
  # state machine, not URL-based), but this is a harmless, standard default
  # that avoids a broken deep link if routing is added later.
  custom_error_response {
    error_code         = 403
    response_code      = 200
    response_page_path = "/index.html"
  }

  custom_error_response {
    error_code         = 404
    response_code      = 200
    response_page_path = "/index.html"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  # No custom domain configured -- uses the default *.cloudfront.net
  # certificate, at no extra cost. Swap this block for an ACM cert +
  # aliases if a custom domain is added later.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
