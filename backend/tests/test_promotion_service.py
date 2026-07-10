"""Inner TDD loop for the promotion domain, without HTTP or UI concerns."""

from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

import pytest

from backend.app.models import PromotionDefinition, PromotionType
from backend.app.promotions import (
    PARIS_TIMEZONE,
    ExpiredPromotionError,
    MinimumSubtotalError,
    PromotionCatalog,
    PromotionService,
)


def test_percentage_discount_is_calculated_by_the_domain() -> None:
    result = PromotionService().apply(
        subtotal=Decimal("20.00"),
        code="BIENVENUE10",
    )

    assert result.discount == Decimal("2.00")
    assert result.total == Decimal("18.00")


@pytest.mark.parametrize("code", ["PROMO05", "PROM05"])
def test_fixed_discount_and_alias_share_the_canonical_code(code: str) -> None:
    result = PromotionService().apply(
        subtotal=Decimal("30.00"),
        code=code,
    )

    assert result.applied_code == "PROMO05"
    assert result.discount == Decimal("5.00")
    assert result.total == Decimal("25.00")


def test_subtotal_below_threshold_raises_the_business_error() -> None:
    with pytest.raises(MinimumSubtotalError) as raised:
        PromotionService().apply(
            subtotal=Decimal("19.99"),
            code="BIENVENUE10",
        )

    assert raised.value.message == "Le montant minimum de 20.00 € n'est pas atteint"


def test_fixed_discount_is_capped_by_the_cart_subtotal() -> None:
    result = PromotionService().apply(
        subtotal=Decimal("30.00"),
        code="CADEAU40",
    )

    assert result.discount == Decimal("30.00")
    assert result.total == Decimal("0.00")


def test_second_valid_code_replaces_the_first_without_stacking() -> None:
    result = PromotionService().apply(
        subtotal=Decimal("40.00"),
        code="PROM05",
        active_code="BIENVENUE10",
    )

    assert result.applied_code == "PROMO05"
    assert result.replaced_code == "BIENVENUE10"
    assert result.discount == Decimal("5.00")
    assert result.total == Decimal("35.00")


def expiring_service(now: datetime) -> PromotionService:
    promotion = PromotionDefinition(
        code="JOURJ",
        type=PromotionType.FIXED,
        value=Decimal("5.00"),
        minimum_subtotal=Decimal("0.00"),
        expires_on=date(2026, 7, 10),
    )
    return PromotionService(
        catalog=PromotionCatalog((promotion,)),
        clock=lambda: now,
    )


def test_expiration_day_is_inclusive_until_the_last_second() -> None:
    result = expiring_service(
        datetime(2026, 7, 10, 23, 59, 59, tzinfo=PARIS_TIMEZONE)
    ).apply(subtotal=Decimal("10.00"), code="JOURJ")

    assert result.total == Decimal("5.00")


def test_promotion_is_expired_at_midnight_the_next_day() -> None:
    with pytest.raises(ExpiredPromotionError) as raised:
        expiring_service(
            datetime(2026, 7, 11, 0, 0, 0, tzinfo=PARIS_TIMEZONE)
        ).apply(subtotal=Decimal("10.00"), code="JOURJ")

    assert raised.value.message == "Ce code promo est expiré."
