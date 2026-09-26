# Certificate for the frontend's former custom domain (see
# local.app_domain_name in locals.tf), no longer attached to CloudFront
# since the switch to root_domain below. Requested in us-east-1 via the
# aliased provider in versions.tf, since CloudFront only accepts
# custom-domain certificates issued there, not in var.aws_region.
#
# DNS validation only: Terraform has no access to the registrar's DNS
# management, so there is deliberately no aws_acm_certificate_validation
# resource here to wait for issuance. That resource would block this
# apply until the validation CNAME below is live, which can't happen
# until this certificate is requested and a human adds that record at
# the registrar. Apply this resource alone, hand the validation record
# (see the acm_validation_record output) to whoever manages the
# registrar's DNS, and only reference this certificate's ARN elsewhere
# (the CloudFront distribution's viewer_certificate) once it shows
# Issued - checked manually, e.g.:
#   aws acm describe-certificate --region us-east-1 \
#     --certificate-arn <arn> --query Certificate.Status
resource "aws_acm_certificate" "app_domain" {
  provider = aws.us_east_1

  domain_name       = local.app_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# Certificate for the bare root domain (var.root_domain), the frontend's
# custom domain since it replaced local.app_domain_name. Same us-east-1
# alias, DNS-only validation and manual Issued check as app_domain above,
# for the same reasons. Its validation record is the
# acm_root_validation_record output; it must stay at the registrar for
# ACM to auto-renew this certificate.
resource "aws_acm_certificate" "root_domain" {
  provider = aws.us_east_1

  domain_name       = var.root_domain
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}
