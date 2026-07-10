from __future__ import annotations

from datetime import date
from decimal import Decimal, InvalidOperation
from enum import Enum
from typing import Annotated

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, field_serializer, field_validator


CENT = Decimal("0.01")
ZERO = Decimal("0.00")
MAX_SUBTOTAL = Decimal("999999999.99")

PromoCode = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        min_length=1,
        max_length=64,
        pattern=r"^[A-Za-z0-9]+$",
    ),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)


def validate_and_quantize_money(value: Decimal) -> Decimal:
    """Reject invalid monetary input and return a canonical two-decimal value."""
    if not value.is_finite():
        raise ValueError("Le montant doit etre un nombre fini.")
    if value < ZERO:
        raise ValueError("Le sous-total ne peut pas etre negatif.")
    if value > MAX_SUBTOTAL:
        raise ValueError("Le sous-total depasse le montant maximal autorise.")

    try:
        quantized = value.quantize(CENT)
    except InvalidOperation as exc:
        raise ValueError("Le montant est invalide.") from exc

    if value != quantized:
        raise ValueError("Le montant doit contenir au maximum deux decimales.")
    # Decimal preserves the sign of zero; the public money contract must not
    # expose "-0.00" even though it compares equal to zero.
    return ZERO if quantized == ZERO else quantized


def parse_json_decimal(value: object) -> Decimal:
    """Bridge JSON's number/string types to Decimal without broad coercion."""
    if isinstance(value, bool):
        raise ValueError("Un booleen n'est pas un montant valide.")
    if isinstance(value, Decimal):
        return value
    if isinstance(value, int):
        return Decimal(value)
    if isinstance(value, float):
        # str avoids importing the float's binary approximation into Decimal.
        return Decimal(str(value))
    if isinstance(value, str):
        try:
            return Decimal(value)
        except InvalidOperation as exc:
            raise ValueError("Le montant est invalide.") from exc
    raise ValueError("Le montant doit etre un nombre ou une chaine decimale.")


class PromotionType(str, Enum):
    PERCENTAGE = "percentage"
    FIXED = "fixed"


class PromotionDefinition(StrictModel):
    model_config = ConfigDict(extra="forbid", strict=True, frozen=True)

    code: PromoCode
    aliases: tuple[PromoCode, ...] = ()
    type: PromotionType
    value: Decimal = Field(gt=ZERO, allow_inf_nan=False)
    minimum_subtotal: Decimal = Field(ge=ZERO, allow_inf_nan=False)
    expires_on: date | None = None
    non_stackable: bool = True

    @field_validator("value")
    @classmethod
    def validate_value(cls, value: Decimal) -> Decimal:
        if not value.is_finite():
            raise ValueError("La valeur de la promotion doit etre finie.")
        try:
            quantized = value.quantize(CENT)
        except InvalidOperation as exc:
            raise ValueError("La valeur de la promotion est invalide.") from exc
        if value != quantized:
            raise ValueError("La valeur de la promotion doit avoir au maximum deux decimales.")
        return quantized

    @field_validator("minimum_subtotal")
    @classmethod
    def validate_minimum_subtotal(cls, value: Decimal) -> Decimal:
        return validate_and_quantize_money(value)


class ApplyPromotionRequest(StrictModel):
    subtotal: Decimal = Field(allow_inf_nan=False)
    code: PromoCode
    active_code: PromoCode | None = None

    @field_validator("subtotal", mode="before")
    @classmethod
    def parse_subtotal(cls, value: object) -> Decimal:
        return parse_json_decimal(value)

    @field_validator("subtotal")
    @classmethod
    def validate_subtotal(cls, value: Decimal) -> Decimal:
        return validate_and_quantize_money(value)


class RemovePromotionRequest(StrictModel):
    subtotal: Decimal = Field(allow_inf_nan=False)
    active_code: PromoCode | None = None

    @field_validator("subtotal", mode="before")
    @classmethod
    def parse_subtotal(cls, value: object) -> Decimal:
        return parse_json_decimal(value)

    @field_validator("subtotal")
    @classmethod
    def validate_subtotal(cls, value: Decimal) -> Decimal:
        return validate_and_quantize_money(value)


class PromotionApplicationResponse(StrictModel):
    subtotal: Decimal
    discount: Decimal
    total: Decimal
    applied_code: str | None
    replaced_code: str | None
    message: str

    @field_serializer("subtotal", "discount", "total")
    def serialize_money(self, value: Decimal) -> str:
        return format(value, ".2f")


class PromotionView(StrictModel):
    code: str
    aliases: tuple[str, ...]
    type: PromotionType
    value: Decimal
    minimum_subtotal: Decimal
    expires_on: date | None
    non_stackable: bool

    @field_serializer("value", "minimum_subtotal")
    def serialize_decimal(self, value: Decimal) -> str:
        return format(value, ".2f")


class PromotionCatalogResponse(StrictModel):
    promotions: tuple[PromotionView, ...]


class HealthResponse(StrictModel):
    status: str
