from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal

from behave import given, then, when

from backend.app.promotions import PARIS_TIMEZONE


FRENCH_MONTHS = {
    "janvier": 1,
    "février": 2,
    "mars": 3,
    "avril": 4,
    "mai": 5,
    "juin": 6,
    "juillet": 7,
    "août": 8,
    "septembre": 9,
    "octobre": 10,
    "novembre": 11,
    "décembre": 12,
}


def french_date(day: int, month: str, year: int) -> date:
    try:
        month_number = FRENCH_MONTHS[month.casefold()]
    except KeyError as error:
        raise AssertionError(f"Mois français inconnu: {month}") from error
    return date(year, month_number, day)


@given("un catalogue de produits disponibles")
def given_available_catalog(context) -> None:
    context.promotions.reset_catalog()


@given("mon panier est initialement vide")
def given_empty_cart(context) -> None:
    context.promotions.set_cart(Decimal("0.00"))


@given("un panier avec un sous-total de {subtotal} €")
def given_cart_subtotal(context, subtotal: str) -> None:
    context.promotions.set_cart(Decimal(subtotal))


@given('le code promo "{code}" est déjà appliqué')
def given_active_code(context, code: str) -> None:
    context.promotions.apply_active_code(code)


@given('le code promo "{code}" est expiré depuis le jour J-1')
def given_expired_code(context, code: str) -> None:
    context.promotions.mark_code_expired_since_previous_day(code)


@given("un code promo éligible expirant le {day:d} {month} {year:d}")
def given_expiring_eligible_code(context, day: int, month: str, year: int) -> None:
    context.promotions.add_expiring_eligible_code(french_date(day, month, year))


@given(
    "l'horloge métier indique le {day:d} {month} {year:d} "
    "à {hour:d}:{minute:d}:{second:d}"
)
def given_business_clock(
    context,
    day: int,
    month: str,
    year: int,
    hour: int,
    minute: int,
    second: int,
) -> None:
    instant = datetime.combine(
        french_date(day, month, year),
        datetime.min.time(),
        tzinfo=PARIS_TIMEZONE,
    ).replace(hour=hour, minute=minute, second=second)
    context.promotions.set_clock(instant)


@when('j\'applique le code promo "{code}"')
def when_applying_code(context, code: str) -> None:
    context.promotions.apply_code(code)


@when(
    'j\'applique un code promotionnel exceptionnel "{code}" '
    "de valeur {value} €"
)
def when_applying_exceptional_code(context, code: str, value: str) -> None:
    # La valeur du step est descriptive; le calcul reste autoritaire dans le catalogue.
    assert Decimal(value).is_finite()
    context.promotions.apply_code(code)


@when("j'applique ce code promo")
def when_applying_target_code(context) -> None:
    context.promotions.apply_target_code()


@then("le total final de mon panier est de {expected_total} €")
def then_final_total(context, expected_total: str) -> None:
    assert context.promotions.total == Decimal(expected_total), (
        f"total attendu {expected_total} €, "
        f"obtenu {context.promotions.total:.2f} €"
    )


@then("le total de mon panier reste de {expected_total} €")
def then_total_unchanged(context, expected_total: str) -> None:
    assert context.promotions.total == Decimal(expected_total), (
        f"total attendu inchangé à {expected_total} €, "
        f"obtenu {context.promotions.total:.2f} €"
    )


@then('le code est refusé avec le message "{expected_message}"')
def then_code_rejected_with_message(context, expected_message: str) -> None:
    assert context.promotions.last_status == 400
    assert context.promotions.error_message == expected_message, (
        f"message attendu {expected_message!r}, "
        f"obtenu {context.promotions.error_message!r}"
    )


@then("le code promo est refusé")
def then_code_rejected(context) -> None:
    assert context.promotions.last_status == 400


@then("le code promo est accepté")
def then_code_accepted(context) -> None:
    assert context.promotions.last_status == 200


@then("le premier code est retiré au profit du nouveau code")
def then_previous_code_replaced(context) -> None:
    assert context.promotions.replaced_code == context.promotions.previous_active_code
    assert context.promotions.active_code != context.promotions.previous_active_code


@then('le seul code actif est "{expected_code}"')
def then_only_active_code(context, expected_code: str) -> None:
    assert context.promotions.active_code == expected_code


@then('le seul code actif reste "{expected_code}"')
def then_active_code_unchanged(context, expected_code: str) -> None:
    assert context.promotions.active_code == expected_code


@then('le message de remplacement est "{expected_message}"')
def then_replacement_message(context, expected_message: str) -> None:
    assert context.promotions.last_message == expected_message


@then("le montant retourné n'est pas négatif")
def then_total_is_not_negative(context) -> None:
    assert context.promotions.total >= Decimal("0.00")


@then('le message d\'erreur est exactement "{expected_message}"')
def then_exact_error_message(context, expected_message: str) -> None:
    assert context.promotions.error_message == expected_message
