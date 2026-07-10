from __future__ import annotations

import sys
from pathlib import Path


FEATURES_DIRECTORY = Path(__file__).resolve().parent
PROJECT_ROOT = FEATURES_DIRECTORY.parents[1]

for path in (PROJECT_ROOT, FEATURES_DIRECTORY):
    path_as_string = str(path)
    if path_as_string not in sys.path:
        sys.path.insert(0, path_as_string)

from support.promotion_driver import PromotionDriver  # noqa: E402


def before_scenario(context, _scenario) -> None:
    context.promotions = PromotionDriver()


def after_scenario(context, scenario) -> None:
    if scenario.status == "failed":
        print(f"[KO] {scenario.name} — promotions : {getattr(context, 'promotions', None)}")

