from src.parsers.markdown_parser import MarkdownParser
from src.parsers.pdf_parser import PdfParser
from src.parsers.text_parser import TextParser


PARSER_MAP = {
    "text/plain": TextParser,
    "text/markdown": MarkdownParser,
    "application/pdf": PdfParser,
}


def get_parser(mime_type: str):
    """Get appropriate parser for MIME type.

    Args:
        mime_type: MIME type string (e.g., 'application/pdf')

    Returns:
        DocumentParser instance for the given MIME type.

    Raises:
        ValueError: If MIME type is not supported.
    """
    parser_class = PARSER_MAP.get(mime_type)
    if not parser_class:
        supported = ", ".join(PARSER_MAP.keys())
        raise ValueError(f"Unsupported MIME type: {mime_type}. Supported: {supported}")
    return parser_class()
