resource "aws_ecr_repository" "backend" {
  name                 = "${local.name_prefix}-backend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }
}

# Free-tier storage caps out at 500MB (12-month allowance on new accounts
# only, not Always Free) and this image is already ~975MB, so untagged
# layers left behind by repeated pushes are a real, avoidable cost. Expire
# them automatically rather than accumulating.
resource "aws_ecr_lifecycle_policy" "backend" {
  repository = aws_ecr_repository.backend.name

  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "Expire untagged images after 7 days"
        selection = {
          tagStatus   = "untagged"
          countType   = "sinceImagePushed"
          countUnit   = "days"
          countNumber = 7
        }
        action = {
          type = "expire"
        }
      },
      {
        # Every CI deploy pushes a new git SHA tagged image rather than
        # overwriting one mutable tag, so storage would otherwise grow
        # without bound across many deploys. Ten kept images is enough to
        # roll back to a recent previous deploy by hand if needed, while
        # still bounding the total.
        rulePriority = 2
        description  = "Keep only the 10 most recently pushed tagged images"
        selection = {
          tagStatus      = "tagged"
          tagPatternList = ["*"]
          countType      = "imageCountMoreThan"
          countNumber    = 10
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}
