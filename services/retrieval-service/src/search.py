"""Retrieval Service - Search Logic."""

from typing import Optional

from qdrant_client.models import (
    FieldCondition,
    Filter,
    MatchAny,
    MatchValue,
    Range,
)

from src.models import FilterCondition, SearchFilters


def build_qdrant_filter(filters: Optional[SearchFilters]) -> Optional[Filter]:
    """Translate structured filter DSL to Qdrant Filter.

    Args:
        filters: Structured search filters.

    Returns:
        Qdrant Filter object or None if no filters provided.
    """
    if filters is None:
        return None

    must_conditions = []
    should_conditions = []
    must_not_conditions = []

    if filters.must:
        for condition in filters.must:
            must_conditions.append(_translate_condition(condition))

    if filters.should:
        for condition in filters.should:
            should_conditions.append(_translate_condition(condition))

    if filters.must_not:
        for condition in filters.must_not:
            must_not_conditions.append(_translate_condition(condition))

    if not must_conditions and not should_conditions and not must_not_conditions:
        return None

    return Filter(
        must=must_conditions or None,
        should=should_conditions or None,
        must_not=must_not_conditions or None,
    )


def _translate_condition(condition: FilterCondition) -> FieldCondition:
    """Translate a single FilterCondition to Qdrant FieldCondition.

    Args:
        condition: Filter condition from request.

    Returns:
        Qdrant FieldCondition.

    Raises:
        ValueError: If condition has no valid match criteria.
    """
    if condition.match is not None:
        return FieldCondition(
            key=condition.key,
            match=MatchValue(value=condition.match),
        )
    elif condition.match_any is not None:
        return FieldCondition(
            key=condition.key,
            match=MatchAny(any=condition.match_any),
        )
    elif condition.range is not None:
        return FieldCondition(
            key=condition.key,
            range=Range(
                gte=condition.range.get("gte"),
                lte=condition.range.get("lte"),
                gt=condition.range.get("gt"),
                lt=condition.range.get("lt"),
            ),
        )
    else:
        raise ValueError("Filter must have match, match_any, or range")
