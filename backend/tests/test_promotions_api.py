from __future__ import annotations

from datetime import date, datetime, time, timezone
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient

from backend.app.main import create_app
from backend.app.models import PromotionDefinition, PromotionType
from backend.app.promotions import PARIS_TIMEZONE, PromotionCatalog, PromotionService


@pytest.fixture
def client() -> TestClient:
    with TestClient(create_app()) as test_client:
        yield test_client


@pytest.mark.parametrize(
    ("subtotal", "code", "expected_discount", "expected_total"),
    [
        ("20.00", "BIENVENUE10", "2.00", "18.00"),
        ("50.00", "BIENVENUE10", "5.00", "45.00"),
        ("30.00", "PROMO05", "5.00", "25.00"),
    ],
)
def test_gherkin_success_examples(
    client: TestClient,
    subtotal: str,
    code: str,
    expected_discount: str,
    expected_total: str,
) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={"subtotal": subtotal, "code": code},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["subtotal"] == subtotal
    assert body["discount"] == expected_discount
    assert body["total"] == expected_total
    assert body["applied_code"] == code
    assert body["replaced_code"] is None


def test_fixed_discount_never_makes_total_negative(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={"subtotal": "30.00", "code": "CADEAU40"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "subtotal": "30.00",
        "discount": "30.00",
        "total": "0.00",
        "applied_code": "CADEAU40",
        "replaced_code": None,
        "message": "Le code promo CADEAU40 a été appliqué.",
    }


def test_prom05_alias_resolves_to_canonical_code(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={"subtotal": 30, "code": "prom05"},
    )

    assert response.status_code == 200
    assert response.json()["applied_code"] == "PROMO05"
    assert response.json()["total"] == "25.00"


def test_valid_second_code_replaces_the_active_code(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={
            "subtotal": "40.00",
            "code": "PROM05",
            "active_code": "BIENVENUE10",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["applied_code"] == "PROMO05"
    assert body["replaced_code"] == "BIENVENUE10"
    assert body["discount"] == "5.00"
    assert body["total"] == "35.00"
    assert body["message"] == (
        "Le code promo PROMO05 a remplacé le code BIENVENUE10."
    )


def test_reapplying_same_promotion_is_not_reported_as_replacement(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={
            "subtotal": "50.00",
            "code": "PROMO05",
            "active_code": "PROM05",
        },
    )

    assert response.status_code == 200
    assert response.json()["replaced_code"] is None


@pytest.mark.parametrize(
    ("subtotal", "code", "minimum"),
    [
        ("19.99", "BIENVENUE10", "20.00"),
        ("29.99", "PROMO05", "30.00"),
        ("29.99", "CADEAU40", "30.00"),
    ],
)
def test_minimum_subtotal_is_enforced(
    client: TestClient, subtotal: str, code: str, minimum: str
) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={"subtotal": subtotal, "code": code},
    )

    assert response.status_code == 400
    assert response.json() == {
        "detail": f"Le montant minimum de {minimum} € n'est pas atteint"
    }


def test_invalid_second_code_is_rejected_without_a_replacement(
    client: TestClient,
) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={
            "subtotal": "50.00",
            "code": "INCONNU",
            "active_code": "BIENVENUE10",
        },
    )

    assert response.status_code == 400
    assert response.json() == {"detail": "Ce code promo est invalide."}


def test_remove_promotion_restores_subtotal(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/remove",
        json={"subtotal": "50.00", "active_code": "PROM05"},
    )

    assert response.status_code == 200
    assert response.json() == {
        "subtotal": "50.00",
        "discount": "0.00",
        "total": "50.00",
        "applied_code": None,
        "replaced_code": None,
        "message": "Le code promo PROMO05 a été retiré.",
    }


def test_negative_zero_is_canonicalized_to_zero(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/remove",
        json={"subtotal": "-0.00", "active_code": None},
    )

    assert response.status_code == 200
    assert response.json()["subtotal"] == "0.00"
    assert response.json()["total"] == "0.00"


def test_catalog_exposes_codes_alias_and_no_invented_expiration(
    client: TestClient,
) -> None:
    response = client.get("/api/promotions")

    assert response.status_code == 200
    by_code = {
        promotion["code"]: promotion for promotion in response.json()["promotions"]
    }
    assert set(by_code) == {"BIENVENUE10", "PROMO05", "CADEAU40"}
    assert by_code["PROMO05"]["aliases"] == ["PROM05"]
    assert by_code["PROMO05"]["value"] == "5.00"
    assert by_code["PROMO05"]["minimum_subtotal"] == "30.00"
    assert all(promotion["expires_on"] is None for promotion in by_code.values())
    assert all(promotion["non_stackable"] is True for promotion in by_code.values())


@pytest.mark.parametrize(
    "payload",
    [
        {"subtotal": "-0.01", "code": "BIENVENUE10"},
        {"subtotal": "20.001", "code": "BIENVENUE10"},
        {"subtotal": True, "code": "BIENVENUE10"},
        {"subtotal": "20.00", "code": "BIENVENUE10", "unexpected": True},
        {"subtotal": "20.00", "code": 123},
    ],
)
def test_request_validation_is_strict(client: TestClient, payload: dict[str, object]) -> None:
    response = client.post("/api/promotions/apply", json=payload)

    assert response.status_code == 422


def expiring_service(now: datetime) -> PromotionService:
    definition = PromotionDefinition(
        code="JOURJ",
        type=PromotionType.FIXED,
        value=Decimal("5.00"),
        minimum_subtotal=Decimal("0.00"),
        expires_on=date(2026, 7, 10),
    )
    return PromotionService(
        catalog=PromotionCatalog((definition,)),
        clock=lambda: now,
    )


@pytest.mark.parametrize(
    "valid_now",
    [
        datetime(2026, 7, 10, 23, 59, 59, tzinfo=PARIS_TIMEZONE),
        datetime.combine(date(2026, 7, 10), time.max, tzinfo=PARIS_TIMEZONE),
        # 21:59:59 UTC is 23:59:59 in Paris in July.
        datetime(2026, 7, 10, 21, 59, 59, tzinfo=timezone.utc),
    ],
)
def test_expiration_date_is_inclusive_through_end_of_local_day(
    valid_now: datetime,
) -> None:
    with TestClient(create_app(expiring_service(valid_now))) as client:
        response = client.post(
            "/api/promotions/apply",
            json={"subtotal": "10.00", "code": "JOURJ"},
        )

    assert response.status_code == 200
    assert response.json()["total"] == "5.00"


@pytest.mark.parametrize(
    "expired_now",
    [
        datetime(2026, 7, 11, 0, 0, 0, tzinfo=PARIS_TIMEZONE),
        # 22:00 UTC is midnight on the next day in Paris in July.
        datetime(2026, 7, 10, 22, 0, 0, tzinfo=timezone.utc),
    ],
)
def test_expired_promotion_has_exact_business_error(expired_now: datetime) -> None:
    with TestClient(create_app(expiring_service(expired_now))) as client:
        response = client.post(
            "/api/promotions/apply",
            json={"subtotal": "10.00", "code": "JOURJ"},
        )

    assert response.status_code == 400
    assert response.json() == {"detail": "Ce code promo est expiré."}


def test_percentage_discount_uses_decimal_half_up_rounding(client: TestClient) -> None:
    response = client.post(
        "/api/promotions/apply",
        json={"subtotal": "20.05", "code": "BIENVENUE10"},
    )

    assert response.status_code == 200
    assert response.json()["discount"] == "2.01"
    assert response.json()["total"] == "18.04"
