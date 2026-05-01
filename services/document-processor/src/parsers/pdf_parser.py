import pdfplumber
from src.parsers.base import DocumentParser


class PdfParser(DocumentParser):
    """Parser for PDF files using pdfplumber."""

    def parse(self, file_path: str) -> str:
        """Extract text from PDF file.

        Args:
            file_path: Path to the PDF file.

        Returns:
            Extracted text content from all pages, separated by newlines.
        """
        text_parts = []
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
        return "\n\n".join(text_parts)
