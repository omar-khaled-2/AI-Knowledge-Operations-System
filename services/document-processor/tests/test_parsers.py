import pytest
from src.parsers.base import DocumentParser


class FakeParser(DocumentParser):
    def parse(self, file_path: str) -> str:
        return "parsed content"


def test_parser_interface():
    parser = FakeParser()
    result = parser.parse("test.txt")
    assert result == "parsed content"
