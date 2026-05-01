import boto3
import structlog

logger = structlog.get_logger()


class S3Client:
    """Client for downloading files from AWS S3."""

    def __init__(self, bucket: str, region: str = "eu-west-3"):
        """Initialize S3 client.

        Args:
            bucket: S3 bucket name.
            region: AWS region.
        """
        self.bucket = bucket
        self.region = region
        self._client = None

    @property
    def client(self):
        """Lazy initialization of boto3 S3 client."""
        if self._client is None:
            self._client = boto3.client("s3", region_name=self.region)
        return self._client

    def download_file(self, object_key: str, dest_path: str) -> None:
        """Download file from S3 to local path.

        Args:
            object_key: S3 object key.
            dest_path: Local destination path.
        """
        logger.info("Downloading file from S3", bucket=self.bucket, object_key=object_key)
        self.client.download_file(self.bucket, object_key, dest_path)
        logger.info("Download complete", dest_path=dest_path)
