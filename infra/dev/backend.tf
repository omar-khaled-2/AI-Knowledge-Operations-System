# -----------------------------------------------------------------------------
# Development Environment - Backend Configuration
# -----------------------------------------------------------------------------
# Uses local backend for state storage.
# -----------------------------------------------------------------------------

terraform {
  backend "local" {
    path = "terraform.tfstate"
  }
}
