import os
import tempfile

import pytest
from src.parsers.base import DocumentParser
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
