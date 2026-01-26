from __future__ import annotations

import csv
from pathlib import Path
from typing import Dict, Any

import yaml

from evaluator import evaluate_constant


HERE = Path(__file__).resolve().parent
ENGINE_ROOT = HERE.parent
SYMBOLS_CSV = ENGINE_ROOT / "symbols" / "symbols.csv"
RECIPES_YAML = ENGINE_ROOT / "recipes" / "constants.yaml"


def load_symbols(path: Path) -> Dict[str, float]:
    symbols: Dict[str, float] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            token = row["token"].strip()
            value_str = row["value"].strip()
            if token and value_str:
                symbols[token] = float(value_str)
    return symbols


def load_constants(path: Path) -> list[Dict[str, Any]]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    return data.get("constants", [])


def main() -> int:
    symbols = load_symbols(SYMBOLS_CSV)
    constants = load_constants(RECIPES_YAML)

    print(f"Loaded {len(symbols)} symbols from {SYMBOLS_CSV}")
    print(f"Loaded {len(constants)} constants from {RECIPES_YAML}\n")

    ok = 0
    fail = 0

    for c in constants:
        cid = c["constant_id"]
        try:
            computed = evaluate_constant(c, symbols, inversion_boundary_token="IB")
            expected = c.get("expected_value")

            if expected is None:
                print(f"{cid:20s} = {computed}   (no expected)")
                ok += 1
            else:
                expected = float(expected)
                abs_err = abs(computed - expected)
                rel_err = abs_err / abs(expected) if expected != 0 else float("inf")
                print(f"{cid:20s} = {computed}   expected={expected}   rel_err={rel_err}")
                ok += 1

        except Exception as e:
            print(f"{cid:20s} ERROR: {e}")
            fail += 1

    print(f"\nDone. ok={ok} fail={fail}")
    return 0 if fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
