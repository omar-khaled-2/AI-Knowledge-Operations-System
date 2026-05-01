# -----------------------------------------------------------------------------
# Development Environment - Variables
# -----------------------------------------------------------------------------

variable "aws_region" {
  description = "AWS region for all resources. Single source of truth for region."
  type        = string
  default     = "eu-west-3"
}

variable "documents_bucket_name" {
  description = "Name of the S3 bucket for documents. Must be globally unique."
  type        = string
  default     = "lalo-documents-omar"
}

variable "cors_allowed_origins" {
  description = "List of origins allowed for CORS on the documents S3 bucket"
  type        = list(string)
  default     = ["http://localhost:3000"]
}
