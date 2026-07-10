from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime, timedelta
from decimal import Decimal

from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.models import ZERO, PromotionDefinition, PromotionType
from backend.app.promotions import (
    DEFAULT_PROMOTIONS,
    PARIS_TIMEZONE,
    PromotionCatalog,
    PromotionService,
)


@dataclass
class PromotionDriver:
    """Thin test adapter between business-language steps and the public API."""

    subtotal: Decimal = ZERO
    total: Decimal = ZERO
    discount: Decimal = ZERO
    active_code: str | None = None
    previous_active_code: str | None = None
    replaced_code: str | None = None
    last_status: int | None = None
    last_message: str | None = None
    error_message: str | None = None
    target_code: str | None = None
    now: datetime = field(
        default_factory=lambda: datetime(2026, 7, 10, 12, 0, tzinfo=PARIS_TIMEZONE)
    )
    _expirations: dict[str, date] = field(default_factory=dict)
    _extra_definitions: list[PromotionDefinition] = field(default_factory=list)

    def reset_catalog(self) -> None:
        self._expirations.clear()
        self._extra_definitions.clear()
        self.target_code = None
        self.now = datetime(2026, 7, 10, 12, 0, tzinfo=PARIS_TIMEZONE)

    def set_cart(self, subtotal: Decimal) -> None:
        self.subtotal = subtotal
        self.total = subtotal
        self.discount = ZERO
        self.active_code = None
        self.previous_active_code = None
        self.replaced_code = None
        self.last_status = None
        self.last_message = None
        self.error_message = None

    def mark_code_expired_since_previous_day(self, code: str) -> None:
        canonical_code = self._canonical_code(code)
        self._expirations[canonical_code] = self.now.date() - timedelta(days=1)

    def add_expiring_eligible_code(self, expires_on: date) -> None:
        self.target_code = "JOURJ"
        self._extra_definitions = [
            PromotionDefinition(
                code=self.target_code,
                type=PromotionType.FIXED,
                value=Decimal("5.00"),
                minimum_subtotal=ZERO,
                expires_on=expires_on,
            )
        ]
        self.set_cart(Decimal("10.00"))

    def set_clock(self, instant: datetime) -> None:
        if instant.tzinfo is None or instant.utcoffset() is None:
            raise ValueError("L'horloge BDD doit être timezone-aware.")
        self.now = instant

    def apply_active_code(self, code: str) -> None:
        self.apply_code(code)
        if self.last_status != 200:
            raise AssertionError(
                f"Impossible de préparer le code actif {code}: {self.error_message}"
            )

    def apply_code(self, code: str) -> None:
        self.previous_active_code = self.active_code
        payload = {
            "subtotal": format(self.subtotal, ".2f"),
            "code": code,
            "active_code": self.active_code,
        }

        with TestClient(create_app(self._build_service())) as client:
            response = client.post("/api/promotions/apply", json=payload)

        self.last_status = response.status_code
        body = response.json()

        if response.status_code != 200:
            detail = body.get("detail")
            self.error_message = detail if isinstance(detail, str) else str(detail)
            self.last_message = None
            self.replaced_code = None
            return

        self.error_message = None
        self.last_message = body["message"]
        self.replaced_code = body["replaced_code"]
        self.active_code = body["applied_code"]
        self.discount = Decimal(body["discount"])
        self.total = Decimal(body["total"])

    def apply_target_code(self) -> None:
        if self.target_code is None:
            raise AssertionError("Aucun code cible n'a été préparé pour ce scénario.")
        self.apply_code(self.target_code)

    def _canonical_code(self, code: str) -> str:
        promotion = PromotionCatalog(DEFAULT_PROMOTIONS).find(code)
        if promotion is None:
            raise AssertionError(f"Le code {code} n'existe pas dans le catalogue de test.")
        return promotion.code

    def _build_service(self) -> PromotionService:
        definitions = tuple(
            definition.model_copy(
                update={
                    "expires_on": self._expirations.get(
                        definition.code,
                        definition.expires_on,
                    )
                }
            )
            for definition in DEFAULT_PROMOTIONS
        ) + tuple(self._extra_definitions)

        return PromotionService(
            catalog=PromotionCatalog(definitions),
            clock=lambda: self.now,
        )
