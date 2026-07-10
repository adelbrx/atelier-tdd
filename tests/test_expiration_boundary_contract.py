"""Contrat déterministe de la borne d'expiration du domaine promotionnel."""

from __future__ import annotations

import unittest
from datetime import date, datetime, time, timezone
from decimal import Decimal

from backend.app.models import PromotionDefinition, PromotionType
from backend.app.promotions import (
    ExpiredPromotionError,
    PARIS_TIMEZONE,
    PromotionCatalog,
    PromotionService,
)


EXPIRATION_DAY = date(2026, 7, 10)


def _service_at(now: datetime) -> PromotionService:
    promotion = PromotionDefinition(
        code="JOURJ",
        type=PromotionType.FIXED,
        value=Decimal("5.00"),
        minimum_subtotal=Decimal("0.00"),
        expires_on=EXPIRATION_DAY,
    )
    return PromotionService(
        catalog=PromotionCatalog((promotion,)),
        clock=lambda: now,
    )


class ExpirationBoundaryContractTests(unittest.TestCase):
    def test_code_is_valid_through_the_last_instant_of_expiration_day(self) -> None:
        instants = (
            datetime(2026, 7, 10, 23, 59, 59, tzinfo=PARIS_TIMEZONE),
            datetime.combine(EXPIRATION_DAY, time.max, tzinfo=PARIS_TIMEZONE),
            # En juillet, 21:59:59 UTC correspond à 23:59:59 à Paris.
            datetime(2026, 7, 10, 21, 59, 59, tzinfo=timezone.utc),
        )

        for instant in instants:
            with self.subTest(instant=instant):
                result = _service_at(instant).apply(
                    subtotal=Decimal("10.00"),
                    code="JOURJ",
                )
                self.assertEqual(result.total, Decimal("5.00"))
                self.assertEqual(result.applied_code, "JOURJ")

    def test_code_expires_at_midnight_and_uses_the_exact_business_message(self) -> None:
        instants = (
            datetime(2026, 7, 11, 0, 0, 0, tzinfo=PARIS_TIMEZONE),
            # En juillet, 22:00:00 UTC correspond à minuit à Paris.
            datetime(2026, 7, 10, 22, 0, 0, tzinfo=timezone.utc),
        )

        for instant in instants:
            with self.subTest(instant=instant):
                with self.assertRaises(ExpiredPromotionError) as raised:
                    _service_at(instant).apply(
                        subtotal=Decimal("10.00"),
                        code="JOURJ",
                    )
                self.assertEqual(raised.exception.message, "Ce code promo est expiré.")


if __name__ == "__main__":
    unittest.main()
