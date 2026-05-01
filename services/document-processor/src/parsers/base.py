from abc import ABC, abstractmethod


class DocumentParser(ABC):
    """Abstract base class for document parsers."""

    @abstractmethod
    def parse(self, file_path: str) -> str:
        """Extract raw text from a file.

        Args:
            file_path: Path to the file to parse.

        Returns:
            Raw text content extracted from the file.
        """
        pass
