# -----------------------------------------------------------------------------
# S3 Module - Variables
# -----------------------------------------------------------------------------

variable "bucket_name" {
  description = "Name of the S3 bucket. Must be globally unique."
  type        = string
}

variable "tags" {
  description = "Tags to apply to the S3 bucket"
  type        = map(string)
  default     = {}
}

variable "cors_allowed_origins" {
  description = "List of origins allowed for CORS (e.g., ['http://localhost:3000'])"
  type        = list(string)
  default     = []
}
