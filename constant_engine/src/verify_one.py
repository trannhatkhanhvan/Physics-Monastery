from __future__ import annotations

import csv
import sys
from pathlib import Path
from typing import Dict, Any

import yaml

from evaluator import evaluate_constant

import math

def sci(x: float, sig: int = 16) -> str:
    """
    Return scientific notation as: mantissa × 10^exponent
    """
    if x == 0:
        return f"0 × 10^0"
    exp = int(math.floor(math.log10(abs(x))))
    mant = x / (10 ** exp)
    return f"{mant:.{sig}g} × 10^{exp}"



HERE = Path(__file__).resolve().parent
ENGINE_ROOT = HERE.parent
SYMBOLS_CSV = ENGINE_ROOT / "symbols" / "symbols.csv"
RECIPES_YAML = ENGINE_ROOT / "recipes" / "constants.yaml"


def digits_match_count(a: str, b: str) -> int:
    """Count matching digits from the start, ignoring non-digits."""
    a_digits = [ch for ch in a if ch.isdigit()]
    b_digits = [ch for ch in b if ch.isdigit()]
    n = min(len(a_digits), len(b_digits))
    count = 0
    for i in range(n):
        if a_digits[i] == b_digits[i]:
            count += 1
        else:
            break
    return count


def computed_digits_string(x: float, ref_digits: str) -> str:
    """
    Produce a digit string for x with the same number of digits as ref_digits
    (ignoring non-digits in ref_digits), by rounding x to an integer when ref is integer-like.
    This is the simple version that works for c-style exact integers.
    """
    ref_len = sum(ch.isdigit() for ch in ref_digits)
    # For now assume integer exact constants (like c). Round to nearest int.
    return str(int(round(x))).zfill(ref_len)

def collect_tokens(recipe: Dict[str, Any], symbols: Dict[str, float]) -> list[str]:
    """
    Collect unique primitive tokens used by the constant recipe.
    - ignores exponents
    - expands known derived tokens (e.g., zhe_1_minus_zhe_2 -> zhe_1, zhe_2)
    """
    tokset = set()

    def add_factor_map(m: Dict[str, Any]):
        for t in m.keys():
            tokset.add(t)

    # Factor maps
    add_factor_map(recipe["external_geometry"]["numerator"])
    add_factor_map(recipe["external_geometry"]["denominator"])
    add_factor_map(recipe["external_boundary"]["numerator"])
    add_factor_map(recipe["external_boundary"]["denominator"])
    add_factor_map(recipe["inversion_geometry"]["numerator"])
    add_factor_map(recipe["inversion_geometry"]["denominator"])

    # Fixed inversion boundary
    tokset.add("IB")

    # Root transform token itself
    rt = recipe["root_transform"]["id"]
    tokset.add(rt)

    # Expand common derived root tokens (manual rewrite table for now)
    DERIVED_EXPAND = {
        "zhe_1_minus_zhe_2": ["zhe_1", "zhe_2"],
    }
    if rt in DERIVED_EXPAND:
        tokset.discard(rt)  # remove derived token
        for t in DERIVED_EXPAND[rt]:
            tokset.add(t)

    # Pretty order: put known high-level ones first if you like
    preferred_order = ["l_p", "t_p", "G_Gi"]
    ordered = [t for t in preferred_order if t in tokset]
    remaining = sorted(t for t in tokset if t not in preferred_order)

    # Force IB to be last
    if "IB" in remaining:
        remaining.remove("IB")
        remaining.append("IB")
    elif "IB" in ordered:
        ordered.remove("IB")
        remaining.append("IB")

    return ordered + remaining


def load_symbols(path: Path) -> Dict[str, float]:
    symbols: Dict[str, float] = {}
    with path.open("r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            token = row["token"].strip()
            value_str = row["value"].strip()
            if not token:
                continue
            if not value_str:
                continue
            symbols[token] = float(value_str)
    return symbols


def load_recipes(path: Path) -> Dict[str, Any]:
    data = yaml.safe_load(path.read_text(encoding="utf-8"))
    # expected format: {"constants": [ {recipe1}, {recipe2}, ... ]}
    constants = data.get("constants", [])
    return {c["constant_id"]: c for c in constants}


def main() -> int:
    if len(sys.argv) < 2:
        print("Usage: python verify_one.py <constant_id>")
        print("Example: python verify_one.py demo")
        return 2

    constant_id = sys.argv[1].strip()

    symbols = load_symbols(SYMBOLS_CSV)
    recipes = load_recipes(RECIPES_YAML)

    if constant_id not in recipes:
        print(f"Constant '{constant_id}' not found in {RECIPES_YAML}.")
        print("Available constants:")
        for k in sorted(recipes.keys()):
            print(" -", k)
        return 2

    recipe = recipes[constant_id]
    computed = evaluate_constant(recipe, symbols, inversion_boundary_token="IB")
    dim = recipe.get("dimension")
    dim_suffix = f" {dim}" if dim else ""

    print(f"Computed: {sci(computed)}{dim_suffix}")

    expected = recipe.get("expected_value")
    expected_kind = recipe.get("expected_kind", "measured")  # default

    if expected is not None:
        expected = float(expected)

        if expected_kind == "exact":
            ref_digits = recipe.get("expected_digits")
            label = recipe.get("expected_digits_label", "Exact")

            if not ref_digits:
                # fallback to old behavior if digits not provided
                abs_err = abs(computed - expected)
                rel_err = abs_err / abs(expected) if expected != 0 else float("inf")
                print(f"Expected: {sci(expected)}{dim_suffix}   ({label})")
                print(f"Abs err:  {abs_err}")
                print(f"          {sci(abs_err)}")
            else:
                comp_digits = computed_digits_string(computed, ref_digits)
                match_n = digits_match_count(comp_digits, ref_digits)
                total_n = sum(ch.isdigit() for ch in ref_digits)

                print(f"Expected: {sci(expected)}{dim_suffix}   ({label})")
                print(f"Digits:   computed={comp_digits}")
                print(f"          expected={ref_digits}")

                if match_n >= total_n:
                    print(f"Match:    Full digit match ({total_n} digits)")
                else:
                    print(f"Match:    {match_n}-digit match (of {total_n})")

                print(f"Group:    column={recipe.get('column')} island={recipe.get('island')}")
                print(f"Root Transform: {recipe['root_transform']['id']}")
                tokens = collect_tokens(recipe, symbols)
                print("Tokens:   " + ", ".join(tokens))


        else:
            # measured/uncertainty style (your current behavior)
            abs_err = abs(computed - expected)
            rel_err = abs_err / abs(expected) if expected != 0 else float("inf")

            print(f"Expected: {sci(expected)}")

            print(f"Abs err:  {abs_err}")
            print(f"          {sci(abs_err)}")

            print(f"Rel err:  {rel_err}")
            print(f"          {sci(rel_err)}")
    else:
        print("Expected: (not provided)")

    print()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
