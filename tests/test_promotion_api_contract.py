"""Tests d'acceptation HTTP indépendants de l'implémentation FastAPI.

Ces tests utilisent uniquement la bibliothèque standard. Ils s'exécutent contre
une API MicroShop déjà démarrée lorsque ``MICROSHOP_API_URL`` est défini.
"""

from __future__ import annotations

import json
import os
import unittest
from decimal import Decimal
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


API_URL = os.getenv("MICROSHOP_API_URL", "").rstrip("/")


def _request_json(path: str, payload: dict[str, Any]) -> tuple[int, dict[str, Any]]:
    request = Request(
        f"{API_URL}{path}",
        data=json.dumps(payload).encode("utf-8"),
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urlopen(request, timeout=5) as response:  # noqa: S310 - URL fournie par le testeur
            return response.status, json.loads(response.read().decode("utf-8"))
    except HTTPError as error:
        return error.code, json.loads(error.read().decode("utf-8"))
    except URLError as error:
        raise AssertionError(
            f"API MicroShop inaccessible à {API_URL!r}. "
            "Démarrez-la avant les tests ou corrigez MICROSHOP_API_URL."
        ) from error


def _money(value: Any) -> Decimal:
    """Compare les montants sans dépendre de leur sérialisation JSON."""

    return Decimal(str(value)).quantize(Decimal("0.01"))


@unittest.skipUnless(
    API_URL,
    "Test boîte noire désactivé : définir MICROSHOP_API_URL vers l'API démarrée.",
)
class PromotionApiContractTests(unittest.TestCase):
    endpoint = "/api/promotions/apply"

    def assert_success(
        self,
        *,
        subtotal: str,
        code: str,
        expected_code: str,
        expected_discount: str,
        expected_total: str,
    ) -> dict[str, Any]:
        status, body = _request_json(
            self.endpoint,
            {"subtotal": subtotal, "code": code},
        )

        self.assertEqual(status, 200, body)
        self.assertEqual(_money(body["subtotal"]), _money(subtotal))
        self.assertEqual(_money(body["discount"]), _money(expected_discount))
        self.assertEqual(_money(body["total"]), _money(expected_total))
        self.assertEqual(body["applied_code"], expected_code)
        self.assertIsNone(body["replaced_code"])
        self.assertGreaterEqual(_money(body["total"]), Decimal("0.00"))
        return body

    def test_nominal_cases_and_inclusive_thresholds(self) -> None:
        cases = (
            ("20.00", "BIENVENUE10", "BIENVENUE10", "2.00", "18.00"),
            ("50.00", "BIENVENUE10", "BIENVENUE10", "5.00", "45.00"),
            ("30.00", "PROMO05", "PROMO05", "5.00", "25.00"),
        )
        for subtotal, code, canonical_code, discount, total in cases:
            with self.subTest(subtotal=subtotal, code=code):
                self.assert_success(
                    subtotal=subtotal,
                    code=code,
                    expected_code=canonical_code,
                    expected_discount=discount,
                    expected_total=total,
                )

    def test_prom05_alias_has_the_same_effect_and_canonical_code(self) -> None:
        self.assert_success(
            subtotal="30.00",
            code="PROM05",
            expected_code="PROMO05",
            expected_discount="5.00",
            expected_total="25.00",
        )

    def test_below_each_threshold_is_rejected(self) -> None:
        cases = (
            ("19.99", "BIENVENUE10"),
            ("29.99", "PROMO05"),
            ("29.99", "PROM05"),
            ("29.99", "CADEAU40"),
        )
        for subtotal, code in cases:
            with self.subTest(subtotal=subtotal, code=code):
                status, body = _request_json(
                    self.endpoint,
                    {"subtotal": subtotal, "code": code},
                )
                self.assertEqual(status, 400, body)
                self.assertIsInstance(body.get("detail"), str)
                self.assertTrue(body["detail"].strip())

    def test_fixed_discount_is_capped_so_total_and_discount_are_consistent(self) -> None:
        body = self.assert_success(
            subtotal="30.00",
            code="CADEAU40",
            expected_code="CADEAU40",
            expected_discount="30.00",
            expected_total="0.00",
        )
        self.assertEqual(
            _money(body["subtotal"]) - _money(body["discount"]),
            _money(body["total"]),
        )

    def test_second_valid_code_replaces_first_without_accumulating_discounts(self) -> None:
        cases = (
            ("PROMO05", "BIENVENUE10", "PROMO05", "10.00", "90.00"),
            ("BIENVENUE10", "PROMO05", "BIENVENUE10", "5.00", "95.00"),
            ("PROM05", "BIENVENUE10", "PROMO05", "10.00", "90.00"),
        )
        for active, new, replaced, discount, total in cases:
            with self.subTest(active=active, new=new):
                status, body = _request_json(
                    self.endpoint,
                    {"subtotal": "100.00", "code": new, "active_code": active},
                )
                self.assertEqual(status, 200, body)
                self.assertEqual(body["applied_code"], new)
                self.assertEqual(body["replaced_code"], replaced)
                self.assertEqual(_money(body["discount"]), _money(discount))
                self.assertEqual(_money(body["total"]), _money(total))

                message = body.get("message", "")
                self.assertIsInstance(message, str)
                self.assertIn("remplac", message.casefold())
                self.assertIn(replaced, message)
                self.assertIn(new, message)


if __name__ == "__main__":
    unittest.main()
