# -----------------------------------------------------------------------------
# Development Environment - Main Configuration
# -----------------------------------------------------------------------------
# Calls the reusable S3 module to create a documents bucket.
# -----------------------------------------------------------------------------

module "documents_bucket" {
  source = "../modules/s3"

  bucket_name = var.documents_bucket_name

  tags = {
    Environment = "dev"
    Project     = "documents"
  }

  cors_allowed_origins = var.cors_allowed_origins
}
