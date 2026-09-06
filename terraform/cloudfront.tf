resource "aws_cloudfront_origin_access_control" "frontend" {
  name                              = "${local.name_prefix}-frontend-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# R8 / §3.3: the five required headers on every HTML/JS/CSS response.
# connect-src allows Open-Meteo (browser weather) and this region's HTTP APIs
# without referencing the API Gateway resource (that would cycle with Lambda's
# CORS_ORIGINS is CloudFront domain).
resource "aws_cloudfront_response_headers_policy" "frontend_security" {
  name    = "${local.name_prefix}-security-headers"
  comment = "R8 security headers for the MyPowerPlant SPA"

  security_headers_config {
    content_type_options {
      override = true
    }
    frame_options {
      frame_option = "DENY"
      override     = true
    }
    referrer_policy {
      referrer_policy = "strict-origin-when-cross-origin"
      override        = true
    }
    strict_transport_security {
      access_control_max_age_sec = 31536000
      include_subdomains         = true
      preload                    = false
      override                   = true
    }
    content_security_policy {
      override = true
      content_security_policy = join(" ", [
        "default-src 'self';",
        "script-src 'self';",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;",
        "font-src 'self' https://fonts.gstatic.com;",
        "img-src 'self' data:;",
        "connect-src 'self' https://api.open-meteo.com https://*.execute-api.${var.aws_region}.amazonaws.com;",
        "frame-ancestors 'none';",
        "base-uri 'self';",
        "form-action 'self';",
        "object-src 'none';",
      ])
    }
    xss_protection {
      mode_block = true
      protection = true
      override   = true
    }
  }
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
    cache_policy_id            = "658327ea-f89d-4fab-a63d-7e88639e58f6"
    response_headers_policy_id = aws_cloudfront_response_headers_policy.frontend_security.id
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

  # No custom domain configured, so this uses the default *.cloudfront.net
  # certificate, at no extra cost. Swap this block for an ACM cert plus
  # aliases if a custom domain is added later.
  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
