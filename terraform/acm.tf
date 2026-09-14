# Certificate for the frontend's custom domain (see local.app_domain_name
# in locals.tf). Requested in us-east-1 via the aliased provider in
# versions.tf, since CloudFront only accepts custom-domain certificates
# issued there, not in var.aws_region.
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
