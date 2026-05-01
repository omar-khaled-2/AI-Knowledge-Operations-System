from src.parsers.base import DocumentParser


class TextParser(DocumentParser):
    """Parser for plain text files."""

    def parse(self, file_path: str) -> str:
        """Read text file and return contents."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
