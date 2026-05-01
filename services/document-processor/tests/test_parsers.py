import os
import tempfile

import pytest
from src.parsers.base import DocumentParser
from src.parsers.markdown_parser import MarkdownParser
from src.parsers.pdf_parser import PdfParser
from src.parsers.text_parser import TextParser


class FakeParser(DocumentParser):
    def parse(self, file_path: str) -> str:
        return "parsed content"


def test_parser_interface():
    parser = FakeParser()
    result = parser.parse("test.txt")
    assert result == "parsed content"


def test_text_parser_reads_file():
    parser = TextParser()
    with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as f:
        f.write("Hello, world!")
        temp_path = f.name

    try:
        result = parser.parse(temp_path)
        assert result == "Hello, world!"
    finally:
        os.unlink(temp_path)


def test_markdown_parser_reads_file():
    parser = MarkdownParser()
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
        f.write("# Heading\n\nParagraph with **bold** text.")
        temp_path = f.name

    try:
        result = parser.parse(temp_path)
        assert "# Heading" in result
        assert "Paragraph" in result
        assert "**bold**" in result
    finally:
        os.unlink(temp_path)


def test_pdf_parser_reads_pdf():
    parser = PdfParser()

    with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as f:
        temp_path = f.name

    try:
        # Create a minimal PDF with text
        from reportlab.pdfgen import canvas
        c = canvas.Canvas(temp_path)
        c.drawString(100, 700, "Hello from PDF")
        c.save()

        result = parser.parse(temp_path)
        assert "Hello from PDF" in result
    finally:
        os.unlink(temp_path)
