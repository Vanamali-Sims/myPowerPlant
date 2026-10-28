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


# Viewer-request function that routes the /iteration-1/ and /iteration-2/
# snapshots. It used to also check a shared password, which was removed so
# the site is public. The resource address and AWS name keep "basic_auth"
# on purpose: renaming would replace the function, and AWS refuses to
# delete a function that the distribution still uses. It would also change
# the ARN that the deploy role's policy in oidc.tf is scoped to.
resource "aws_cloudfront_function" "basic_auth" {
  name    = "${local.name_prefix}-basic-auth"
  runtime = "cloudfront-js-2.0"
  comment = "Routes the iteration-1 and iteration-2 snapshots"
  publish = true

  code = <<-EOT
    function handler(event) {
        return routeIterationSnapshot(event.request);
    }

    // Frozen builds of past iterations live under /iteration-1/ and
    // /iteration-2/ in the same bucket, each built with a matching Vite
    // base. Every other URI, including the root app, passes through
    // unchanged. A bare /iteration-N is redirected to /iteration-N/, and
    // any extension-less path under a prefix is served that prefix's
    // index.html; without this, both would miss in S3 and the global
    // 403/404 fallback would hand back the root app's index.html instead.
    function routeIterationSnapshot(request) {
        var match = request.uri.match(/^\/(iteration-[12])(\/.*)?$/);
        if (!match) {
            return request;
        }

        var prefix = "/" + match[1] + "/";
        if (match[2] === undefined) {
            return {
                statusCode: 302,
                statusDescription: "Found",
                headers: {
                    "location": { value: prefix }
                }
            };
        }

        var lastSegment = request.uri.substring(request.uri.lastIndexOf("/") + 1);
        if (lastSegment.indexOf(".") === -1) {
            request.uri = prefix + "index.html";
        }
        return request;
    }
  EOT
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  comment             = "${local.name_prefix} frontend"
  aliases             = [var.root_domain]

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

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.basic_auth.arn
    }
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

  # Custom domain (var.root_domain) via the root_domain ACM cert in acm.tf,
  # issued in us-east-1 since that's the only region CloudFront accepts
  # custom-domain certificates from. sni-only avoids the ~$600/month
  # dedicated-IP cost of vip; every browser CloudFront needs to support
  # has supported SNI for years. TLSv1.2_2021 is AWS's current
  # recommended minimum.
  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.root_domain.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }
}
