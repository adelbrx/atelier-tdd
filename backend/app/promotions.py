from __future__ import annotations

from collections.abc import Callable, Iterable
from datetime import datetime, time
from decimal import Decimal, ROUND_HALF_UP
from zoneinfo import ZoneInfo

from .models import (
    CENT,
    ZERO,
    PromotionApplicationResponse,
    PromotionCatalogResponse,
    PromotionDefinition,
    PromotionType,
    PromotionView,
)


PARIS_TIMEZONE = ZoneInfo("Europe/Paris")


class PromotionError(Exception):
    """Base class for errors that are safe to expose to an API client."""

    def __init__(self, message: str) -> None:
        super().__init__(message)
        self.message = message


class UnknownPromotionError(PromotionError):
    def __init__(self) -> None:
        super().__init__("Ce code promo est invalide.")


class ExpiredPromotionError(PromotionError):
    def __init__(self) -> None:
        super().__init__("Ce code promo est expiré.")


class MinimumSubtotalError(PromotionError):
    def __init__(self, minimum_subtotal: Decimal) -> None:
        super().__init__(
            "Ce code promo nécessite un sous-total minimum de "
            f"{minimum_subtotal:.2f} €."
        )


DEFAULT_PROMOTIONS: tuple[PromotionDefinition, ...] = (
    PromotionDefinition(
        code="BIENVENUE10",
        type=PromotionType.PERCENTAGE,
        value=Decimal("10.00"),
        minimum_subtotal=Decimal("20.00"),
    ),
    PromotionDefinition(
        code="PROMO05",
        aliases=("PROM05",),
        type=PromotionType.FIXED,
        value=Decimal("5.00"),
        minimum_subtotal=Decimal("30.00"),
    ),
    PromotionDefinition(
        code="CADEAU40",
        type=PromotionType.FIXED,
        value=Decimal("40.00"),
        minimum_subtotal=Decimal("30.00"),
    ),
)


def normalize_code(code: str) -> str:
    return code.strip().upper()


class PromotionCatalog:
    def __init__(self, promotions: Iterable[PromotionDefinition]) -> None:
        definitions = tuple(promotions)
        if not definitions:
            raise ValueError("Le catalogue de promotions ne peut pas etre vide.")

        by_code: dict[str, PromotionDefinition] = {}
        for promotion in definitions:
            inputs = (promotion.code, *promotion.aliases)
            for input_code in inputs:
                normalized = normalize_code(input_code)
                if normalized in by_code:
                    raise ValueError(f"Code ou alias duplique dans le catalogue: {normalized}")
                by_code[normalized] = promotion

        self._definitions = definitions
        self._by_code = by_code

    @property
    def definitions(self) -> tuple[PromotionDefinition, ...]:
        return self._definitions

    def find(self, code: str) -> PromotionDefinition | None:
        return self._by_code.get(normalize_code(code))


class PromotionService:
    def __init__(
        self,
        catalog: PromotionCatalog | None = None,
        clock: Callable[[], datetime] | None = None,
    ) -> None:
        self.catalog = catalog or PromotionCatalog(DEFAULT_PROMOTIONS)
        self._clock = clock or (lambda: datetime.now(tz=PARIS_TIMEZONE))

    def apply(
        self,
        *,
        subtotal: Decimal,
        code: str,
        active_code: str | None = None,
    ) -> PromotionApplicationResponse:
        promotion = self.catalog.find(code)
        if promotion is None:
            raise UnknownPromotionError()

        if self._is_expired(promotion):
            raise ExpiredPromotionError()

        if subtotal < promotion.minimum_subtotal:
            raise MinimumSubtotalError(promotion.minimum_subtotal)

        discount = self._calculate_discount(subtotal, promotion)
        # Both min operations and max make the monetary floor explicit by design.
        discount = min(discount, subtotal)
        total = max(subtotal - discount, ZERO).quantize(CENT, rounding=ROUND_HALF_UP)

        canonical_active_code = self._canonical_active_code(active_code)
        replaced_code = (
            canonical_active_code
            if canonical_active_code is not None and canonical_active_code != promotion.code
            else None
        )
        if replaced_code is None:
            message = f"Le code promo {promotion.code} a été appliqué."
        else:
            message = (
                f"Le code promo {promotion.code} a remplacé le code {replaced_code}."
            )

        return PromotionApplicationResponse(
            subtotal=subtotal,
            discount=discount,
            total=total,
            applied_code=promotion.code,
            replaced_code=replaced_code,
            message=message,
        )

    def remove(
        self, *, subtotal: Decimal, active_code: str | None = None
    ) -> PromotionApplicationResponse:
        canonical_active_code = self._canonical_active_code(active_code)
        if canonical_active_code is None:
            message = "Aucun code promo n'était appliqué."
        else:
            message = f"Le code promo {canonical_active_code} a été retiré."

        return PromotionApplicationResponse(
            subtotal=subtotal,
            discount=ZERO,
            total=subtotal,
            applied_code=None,
            replaced_code=None,
            message=message,
        )

    def list_promotions(self) -> PromotionCatalogResponse:
        return PromotionCatalogResponse(
            promotions=tuple(
                PromotionView(
                    code=promotion.code,
                    aliases=promotion.aliases,
                    type=promotion.type,
                    value=promotion.value,
                    minimum_subtotal=promotion.minimum_subtotal,
                    expires_on=promotion.expires_on,
                    non_stackable=promotion.non_stackable,
                )
                for promotion in self.catalog.definitions
            )
        )

    def _canonical_active_code(self, active_code: str | None) -> str | None:
        if active_code is None:
            return None
        active_promotion = self.catalog.find(active_code)
        if active_promotion is not None:
            return active_promotion.code
        # An unknown client-side value must never alter the discount calculation.
        # Keeping its normalized label still lets the UI clearly report replacement.
        return normalize_code(active_code)

    def _is_expired(self, promotion: PromotionDefinition) -> bool:
        if promotion.expires_on is None:
            return False

        now = self._clock()
        if now.tzinfo is None or now.utcoffset() is None:
            raise RuntimeError("L'horloge des promotions doit fournir un datetime timezone-aware.")
        local_now = now.astimezone(PARIS_TIMEZONE)
        inclusive_end = datetime.combine(
            promotion.expires_on,
            time.max,
            tzinfo=PARIS_TIMEZONE,
        )
        return local_now > inclusive_end

    @staticmethod
    def _calculate_discount(
        subtotal: Decimal, promotion: PromotionDefinition
    ) -> Decimal:
        if promotion.type is PromotionType.PERCENTAGE:
            discount = subtotal * promotion.value / Decimal("100")
        else:
            discount = promotion.value
        return discount.quantize(CENT, rounding=ROUND_HALF_UP)

