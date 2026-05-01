from src.parsers.base import DocumentParser


class MarkdownParser(DocumentParser):
    """Parser for Markdown files."""

    def parse(self, file_path: str) -> str:
        """Read markdown file and return raw contents (preserving markdown syntax)."""
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
